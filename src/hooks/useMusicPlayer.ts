import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import TrackPlayer, {
  State,
  usePlaybackState,
  useProgress,
  Event,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import { useMusicStore, selectCurrentTrack } from '../stores/musicStore';
import { useUserStore, selectCompletedChallenges } from '../stores/userStore';
import type { MusicChallenge, UseMusicPlayerReturn } from '../types';
import { ensurePlayerSetup, setPlaybackRate, setPlayerVolume, resolvePlayableUrl } from '../services/audioService';
import { saveCompletionServer } from '../services/syncService';
import { PLAYBACK_RULES as RULES } from '../constants/rules';

export const useMusicPlayer = (): UseMusicPlayerReturn => {
  const playbackState = usePlaybackState();
  const progress = useProgress();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentTrack = useMusicStore(selectCurrentTrack);
  const setCurrentTrack = useMusicStore((s) => s.setCurrentTrack);
  const setCurrentPosition = useMusicStore((s) => s.setCurrentPosition);
  const updateProgress = useMusicStore((s) => s.updateProgress);
  const markChallengeComplete = useMusicStore((s) => s.markChallengeComplete);

  const completeChallenge = useUserStore((s) => s.completeChallenge);
  const completedIds = useUserStore(selectCompletedChallenges);

  /** Award each track once per session */
  const awardedRef = useRef<Set<string>>(new Set());

  /** Native active track id (safety) */
  const activeTrackIdRef = useRef<string | null>(null);

  /** Jump detection + counting */
  const lastPosRef = useRef<number>(0);
  const forwardSeekCountRef = useRef<Record<string, number>>({});

  /** Playback rate tracking: current + peak (for penalties) */
  const rateRef = useRef<number>(1);
  const peakRateRef = useRef<number>(1);

  useTrackPlayerEvents([Event.PlaybackTrackChanged], async (e) => {
    if (e.type === Event.PlaybackTrackChanged && e.nextTrack != null) {
      try {
        const t = await TrackPlayer.getTrack(e.nextTrack);
        const nextId = t?.id ?? null;
        activeTrackIdRef.current = nextId;
        if (nextId) {
          awardedRef.current.delete(nextId);
          forwardSeekCountRef.current[nextId] = 0;
        }
        lastPosRef.current = 0;
        // reset rates for the new track session
        rateRef.current = 1;
        peakRateRef.current = 1;
      } catch {
        activeTrackIdRef.current = null;
      }
    }
  });

  useTrackPlayerEvents([Event.RemoteDuck], (e: any) => {
    // iOS/Android audio focus changes (calls, Siri, other apps)
    if (e?.paused === true) {
      TrackPlayer.pause().catch(() => {});
    } else if (e?.paused === false) {
      TrackPlayer.play().catch(() => {});
    }
  });

  // Normalize playback to primitive State
  const normalizedPlayback: State | undefined = useMemo(() => {
    if (typeof playbackState === 'number') return playbackState as State;
    if (playbackState && typeof playbackState === 'object' && 'state' in playbackState) {
      return (playbackState as any).state as State;
    }
    return undefined;
  }, [playbackState]);

  // Derive isPlaying locally (do NOT mirror to store)
  const isPlaying = normalizedPlayback === State.Playing;

  // Light polling for rate (so we can apply rate-based penalties)
  useEffect(() => {
    let mounted = true;
    const id = setInterval(async () => {
      try {
        const r = await TrackPlayer.getRate();
        if (!mounted || typeof r !== 'number') return;
        rateRef.current = r;
        if (r > peakRateRef.current) peakRateRef.current = r; // track peak
      } catch {}
    }, 800);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  /**
   * Fallback jump detector: if reported position jumps forward
   * by more than the threshold, count it as a forward seek.
   */
  useEffect(() => {
    if (!currentTrack) return;
    if (!progress || progress.duration <= 0) return;

    const prev = lastPosRef.current;
    const curr = progress.position;
    const delta = curr - prev;

    if (delta > RULES.FORWARD_SEEK_THRESHOLD_SEC) {
      const id = currentTrack.id;
      forwardSeekCountRef.current[id] = (forwardSeekCountRef.current[id] || 0) + 1;
    }

    // keep monotonic pointer
    if (curr > prev) lastPosRef.current = curr;
  }, [progress.position, progress.duration, currentTrack]);

  // Update UI + award with deductions once
  useEffect(() => {
    if (!currentTrack) return;
    if (!progress || progress.duration <= 0) return;

    if (RULES.REQUIRE_ACTIVE_TRACK_ID) {
      if (activeTrackIdRef.current && activeTrackIdRef.current !== currentTrack.id) return;
    }

    setCurrentPosition(progress.position);
    const pct = (progress.position / progress.duration) * 100;
    updateProgress(currentTrack.id, pct);

    const alreadyCompleted = completedIds.includes(currentTrack.id);
    const alreadyAwardedThisSession = awardedRef.current.has(currentTrack.id);

    // Ignore bogus high pct right at start
    if (progress.position < RULES.MIN_SECONDS_BEFORE_AWARD && pct >= RULES.COMPLETION_THRESHOLD_PCT) {
      return;
    }

    // If re-earn is not allowed and track already completed, bail
    if (alreadyCompleted && !RULES.ALLOW_REEARN_ON_REPLAY) return;

    // If your rules globally disallow awarding on fast rate (legacy), bail
    if (!RULES.AWARD_ON_FAST_RATE && rateRef.current > 1.0) return;

    if (pct >= RULES.COMPLETION_THRESHOLD_PCT && !alreadyAwardedThisSession) {
      awardedRef.current.add(currentTrack.id);

      // ---------- DEDUCTIONS ----------
      const basePoints = currentTrack.points || 0;

      // Forward-seek penalty
      const seeks = forwardSeekCountRef.current[currentTrack.id] || 0;
      const perSeek = RULES.DEDUCT_ON_FORWARD_SEEK ? RULES.FORWARD_SEEK_PENALTY_PCT : 0;
      const forwardPct = seeks * perSeek;

      // Rate penalty (use *peak* rate used during this session)
      const peak = peakRateRef.current;
      let ratePct = 0;
      if (peak >= 2.0 && RULES.RATE_PENALTY_PCT?.[2.0 as 2.0] != null) {
        ratePct = RULES.RATE_PENALTY_PCT[2.0 as 2.0];
      } else if (peak >= 1.25 && RULES.RATE_PENALTY_PCT?.[1.25 as 1.25] != null) {
        ratePct = RULES.RATE_PENALTY_PCT[1.25 as 1.25];
      }

      const totalDeductionPct = Math.min(1, forwardPct + ratePct);
      const penalty = Math.floor(basePoints * totalDeductionPct);
      const effectivePoints = Math.max(0, basePoints - penalty);

      // Persist per-track deduction metadata for Profile
      markChallengeComplete(currentTrack.id, {
        pointsDeducted: penalty,
        forwardSeeks: seeks,
        peakRate: peak,
      });

      // Award (after deductions)
      completeChallenge(currentTrack.id, effectivePoints);

      // rollback on failure
      saveCompletionServer({ challengeId: currentTrack.id, pointsAwarded: effectivePoints })
        .catch(() => {
          // Rollback: (simple example—subtract points and un-complete)
          useUserStore.setState((s) => ({ totalPoints: Math.max(0, s.totalPoints - effectivePoints),
            completedChallenges: s.completedChallenges.filter(id => id !== currentTrack.id) }));
          useMusicStore.setState((s) => ({
            challenges: s.challenges.map(ch => ch.id === currentTrack.id ? { ...ch, completed: false, progress: 0 } : ch)
          }));
        });
    }
  }, [
    progress.position,
    progress.duration,
    currentTrack,
    completedIds,
    setCurrentPosition,
    updateProgress,
    markChallengeComplete,
    completeChallenge,
  ]);

  useTrackPlayerEvents([Event.PlaybackError], (event) => {
    if (event.type === Event.PlaybackError) {
      setError(`Playback error: ${event.message}`);
      setLoading(false);
    }
  });

  /** simple fade helper (per-player volume) */
  const fadeTo = useCallback(async (to: number, ms = 250) => {
    const steps = 10;
    const stepDur = ms / steps;
    try {
      const from = to > 0 ? 0 : 1; // quick fades at switches
      for (let i = 0; i <= steps; i++) {
        const v = from + (to - from) * (i / steps);
        await setPlayerVolume(Math.max(0, Math.min(1, v)));
        await new Promise((res) => setTimeout(res, stepDur));
      }
    } catch {}
  }, []);

  const play = useCallback(async (track: MusicChallenge) => {
    setLoading(true);
    setError(null);
    try {
      await ensurePlayerSetup();

      try { await fadeTo(0, 180); } catch {}

      activeTrackIdRef.current = null;
      awardedRef.current.delete(track.id);
      forwardSeekCountRef.current[track.id] = 0;
      lastPosRef.current = 0;
      rateRef.current = 1;
      peakRateRef.current = 1;

      const url = await resolvePlayableUrl(track.audioUrl);
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: track.id,
        url: url,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        artwork: (track as any).imageUrl,
      });

      setCurrentTrack(track);
      await TrackPlayer.play();
      activeTrackIdRef.current = track.id;

      try { await fadeTo(1, 180); } catch {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Playback failed';
      setError(msg);
      console.error('TrackPlayer error:', err);
    } finally {
      setLoading(false);
    }
  }, [setCurrentTrack, fadeTo]);

  const pause = useCallback(async () => {
    try { await ensurePlayerSetup(); await TrackPlayer.pause(); } catch (err) { console.error('Pause error:', err); }
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    try {
      await ensurePlayerSetup();

      // Count forward seeks we initiate over the threshold
      if (currentTrack && seconds > lastPosRef.current + RULES.FORWARD_SEEK_THRESHOLD_SEC) {
        const id = currentTrack.id;
        forwardSeekCountRef.current[id] = (forwardSeekCountRef.current[id] || 0) + 1;
      }

      await TrackPlayer.seekTo(seconds);
      lastPosRef.current = seconds; // sync pointer
    } catch (err) {
      console.error('Seek error:', err);
    }
  }, [currentTrack]);

  const resume = useCallback(async () => {
    try { await ensurePlayerSetup(); await TrackPlayer.play(); } catch (err) { console.error('Resume error:', err); }
  }, []);

  /** Expose setRate: also update local refs to track peak rate for penalties */
  const setRate = useCallback(async (rate: number) => {
    try {
      await setPlaybackRate(rate);
      rateRef.current = rate;
      if (rate > peakRateRef.current) peakRateRef.current = rate;
    } catch (e) {
      console.warn('setRate error', e);
    }
  }, []);

  return {
    isPlaying, // derived locally
    currentTrack,
    currentPosition: progress.position,
    duration: progress.duration,
    play,
    pause,
    seekTo,
    resume,
    setRate,
    loading,
    error,
  };
};
