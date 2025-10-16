import { useCallback, useEffect, useRef, useState } from 'react';
import TrackPlayer, {
  State,
  usePlaybackState,
  useProgress,
  Event,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import { useMusicStore, selectCurrentTrack, selectIsPlaying } from '../stores/musicStore';
import { useUserStore, selectCompletedChallenges } from '../stores/userStore';
import type { MusicChallenge, UseMusicPlayerReturn } from '../types';
import { ensurePlayerSetup } from '../services/audioService';
import { PLAYBACK_RULES as RULES } from '../constants/rules';

export const useMusicPlayer = (): UseMusicPlayerReturn => {
  const playbackState = usePlaybackState();
  const progress = useProgress();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentTrack = useMusicStore(selectCurrentTrack);
  const isPlaying = useMusicStore(selectIsPlaying);
  const setCurrentTrack = useMusicStore((s) => s.setCurrentTrack);
  const setIsPlaying = useMusicStore((s) => s.setIsPlaying);
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
  const lastPosRef = useRef<number>(0);                              // last observed position (sec)
  const forwardSeekCountRef = useRef<Record<string, number>>({});    // trackId -> count

  /** Cached rate */
  const rateRef = useRef<number>(1);

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
      } catch {
        activeTrackIdRef.current = null;
      }
    }
  });

  // Light polling for rate (so RULES.AWARD_ON_FAST_RATE can apply)
  useEffect(() => {
    let mounted = true;
    const id = setInterval(async () => {
      try {
        const r = await TrackPlayer.getRate();
        if (mounted && typeof r === 'number') rateRef.current = r;
      } catch {}
    }, 800);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // Keep isPlaying in sync
  useEffect(() => {
    let stateValue: any = playbackState;
    if (typeof playbackState === 'object' && playbackState && 'state' in playbackState) {
      stateValue = (playbackState as any).state;
    }
    const isCurrentlyPlaying = stateValue === State.Playing;
    if (isCurrentlyPlaying !== isPlaying) setIsPlaying(isCurrentlyPlaying);
  }, [playbackState, isPlaying, setIsPlaying]);

  /**
   * Fallback **jump detector**: if the reported position jumps forward
   * by more than the threshold, count it as a forward seek.
   * This covers cases where the native seek finishes before our
   * hook-level seek wrapper runs.
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
      // Optional debug:
      // console.log('counted forward seek via progress jump', id, 'count=', forwardSeekCountRef.current[id]);
    }

    // keep monotonic pointer
    if (curr > prev) lastPosRef.current = curr;
  }, [progress.position, progress.duration, currentTrack]);

  // Update UI + award with deduction once
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

    if (alreadyCompleted && !RULES.ALLOW_REEARN_ON_REPLAY) return;
    if (!RULES.AWARD_ON_FAST_RATE && rateRef.current > 1.0) return;

    if (pct >= RULES.COMPLETION_THRESHOLD_PCT && !alreadyAwardedThisSession) {
      awardedRef.current.add(currentTrack.id);

      // ---------- DEDUCTION HERE ----------
      const basePoints = currentTrack.points || 0;
      const seeks = forwardSeekCountRef.current[currentTrack.id] || 0;
      const perSeek = RULES.DEDUCT_ON_FORWARD_SEEK ? RULES.FORWARD_SEEK_PENALTY_PCT : 0;
      const totalDeductionPct = Math.min(1, seeks * perSeek);
      const penalty = Math.floor(basePoints * totalDeductionPct);
      const effectivePoints = Math.max(0, basePoints - penalty);
      // ------------------------------------

      markChallengeComplete(currentTrack.id);
      completeChallenge(currentTrack.id, effectivePoints);
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

  const play = useCallback(async (track: MusicChallenge) => {
    setLoading(true);
    setError(null);
    try {
      await ensurePlayerSetup();

      activeTrackIdRef.current = null;
      awardedRef.current.delete(track.id);
      forwardSeekCountRef.current[track.id] = 0;
      lastPosRef.current = 0;

      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: track.id,
        url: track.audioUrl,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        artwork: (track as any).imageUrl,
      });

      setCurrentTrack(track);
      await TrackPlayer.play();
      activeTrackIdRef.current = track.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Playback failed';
      setError(msg);
      console.error('TrackPlayer error:', err);
    } finally {
      setLoading(false);
    }
  }, [setCurrentTrack]);

  const pause = useCallback(async () => {
    try { await ensurePlayerSetup(); await TrackPlayer.pause(); } catch (err) { console.error('Pause error:', err); }
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    try {
      await ensurePlayerSetup();

      // Primary counter: when *we* request a forward jump larger than the threshold
      if (currentTrack && seconds > lastPosRef.current + RULES.FORWARD_SEEK_THRESHOLD_SEC) {
        const id = currentTrack.id;
        forwardSeekCountRef.current[id] = (forwardSeekCountRef.current[id] || 0) + 1;
        // Optional debug:
        // console.log('counted forward seek via seekTo', id, 'count=', forwardSeekCountRef.current[id]);
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

  let stateValue: any = playbackState;
  if (typeof playbackState === 'object' && playbackState && 'state' in playbackState) {
    stateValue = (playbackState as any).state;
  }

  return {
    isPlaying: stateValue === State.Playing,
    currentTrack,
    currentPosition: progress.position,
    duration: progress.duration,
    play,
    pause,
    seekTo,
    resume,
    loading,
    error,
  };
};
