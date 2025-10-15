// useMusicPlayer hook - Integrates react-native-track-player with Zustand
import { useCallback, useEffect, useState } from 'react';
import TrackPlayer, {
  State,
  usePlaybackState,
  useProgress,
  Event,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import { useMusicStore, selectCurrentTrack, selectIsPlaying } from '../stores/musicStore';
import { useUserStore } from '../stores/userStore';
import type { MusicChallenge, UseMusicPlayerReturn } from '../types';
import { ensurePlayerSetup } from '../services/audioService'; // ✅ NEW

export const useMusicPlayer = (): UseMusicPlayerReturn => {
  // TrackPlayer hooks
  const playbackState = usePlaybackState();
  const progress = useProgress();

  // Local state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Zustand store selectors
  const currentTrack = useMusicStore(selectCurrentTrack);
  const isPlaying = useMusicStore(selectIsPlaying);
  const setCurrentTrack = useMusicStore((state) => state.setCurrentTrack);
  const setIsPlaying = useMusicStore((state) => state.setIsPlaying);
  const setCurrentPosition = useMusicStore((state) => state.setCurrentPosition);
  const updateProgress = useMusicStore((state) => state.updateProgress);
  const markChallengeComplete = useMusicStore((state) => state.markChallengeComplete);
  const addPoints = useUserStore((state) => state.addPoints);
  const completeChallenge = useUserStore((state) => state.completeChallenge);

  // Track playback state changes
  useEffect(() => {
    let stateValue: any = playbackState;
    if (typeof playbackState === 'object' && playbackState !== null && 'state' in playbackState) {
      stateValue = (playbackState as any).state;
    }
    const isCurrentlyPlaying = stateValue === State.Playing;
    if (isCurrentlyPlaying !== isPlaying) {
      setIsPlaying(isCurrentlyPlaying);
    }
  }, [playbackState, isPlaying, setIsPlaying]);

  // Update position and calculate progress/points
  useEffect(() => {
    if (!currentTrack) return;
    if (!progress || progress.duration <= 0) return; // ✅ guard divide-by-zero/NaN

    setCurrentPosition(progress.position);

    const progressPercentage = (progress.position / progress.duration) * 100;
    updateProgress(currentTrack.id, progressPercentage);

    // Complete at 90% to be resilient to timing variance
    if (progressPercentage >= 90 && !currentTrack.completed) {
      markChallengeComplete(currentTrack.id);
      completeChallenge(currentTrack.id);
      addPoints(currentTrack.points);
    }
  }, [
    progress.position,
    progress.duration,
    currentTrack,
    setCurrentPosition,
    updateProgress,
    markChallengeComplete,
    completeChallenge,
    addPoints,
  ]);

  // Handle track player errors
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
      await ensurePlayerSetup(); // ✅ make sure the player exists

      // Keep UI responsive by setting current track early (optional)
      setCurrentTrack(track);

      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: track.id,
        url: track.audioUrl,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        artwork: (track as any).imageUrl,
      });
      await TrackPlayer.play();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Playback failed';
      setError(errorMessage);
      console.error('TrackPlayer error:', err);
    } finally {
      setLoading(false);
    }
  }, [setCurrentTrack]);

  const pause = useCallback(async () => {
    try {
      await ensurePlayerSetup(); // ✅
      await TrackPlayer.pause();
    } catch (err) {
      console.error('Pause error:', err);
    }
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    try {
      await ensurePlayerSetup(); // ✅
      await TrackPlayer.seekTo(seconds);
    } catch (err) {
      console.error('Seek error:', err);
    }
  }, []);

  const resume = useCallback(async () => {
    try {
      await ensurePlayerSetup(); // ✅
      await TrackPlayer.play();
    } catch (err) {
      console.error('Resume error:', err);
    }
  }, []);

  let stateValue: any = playbackState;
  if (typeof playbackState === 'object' && playbackState !== null && 'state' in playbackState) {
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
