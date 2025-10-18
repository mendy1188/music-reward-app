// Centralized, one-time setup + safe wrappers for TrackPlayer calls.

import TrackPlayer, {
  Capability,
  AppKilledPlaybackBehavior,
} from 'react-native-track-player';
import { getCachedIfExists, cacheInBackground } from './cacheservice';

let setupPromise: Promise<void> | null = null;

/** Ensure TrackPlayer is initialized exactly once. */
export const ensurePlayerSetup = async (): Promise<void> => {
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    await TrackPlayer.setupPlayer({ waitForBuffer: true });

    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SeekTo,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.Stop,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SeekTo],
      progressUpdateEventInterval: 1,
      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      //notificationCapabilities: [Capability.Play, Capability.Pause], could be enabled if needed
      // iOS: Expo config app.config, enable Background -> Audio.
    });
  })();

  try {
    await setupPromise;
  } catch (e) {
    setupPromise = null; // allow retry if setup failed
    throw e;
  }
};

export const resetPlayer = async () => {
  await ensurePlayerSetup();
  await TrackPlayer.reset();
};

export const addTrack = async (track: {
  id: string;
  url: string;
  title: string;
  artist: string;
  duration?: number;
  artwork?: string;
}) => {
  await ensurePlayerSetup();
  await TrackPlayer.add(track);
};

export const playTrack = async () => {
  await ensurePlayerSetup();
  await TrackPlayer.play();
};

export const pauseTrack = async () => {
  await ensurePlayerSetup();
  await TrackPlayer.pause();
};

export const seekToPosition = async (seconds: number) => {
  await ensurePlayerSetup();
  await TrackPlayer.seekTo(seconds);
};

export const getCurrentPosition = async () => {
  await ensurePlayerSetup();
  try { return await TrackPlayer.getPosition(); } catch { return 0; }
};

export const getTrackDuration = async () => {
  await ensurePlayerSetup();
  try { return await TrackPlayer.getDuration(); } catch { return 0; }
};

export const cleanupTrackPlayer = async () => {
  try {
    await ensurePlayerSetup();
    await TrackPlayer.reset();
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

export const handlePlaybackError = (error: any) => {
  console.error('Playback error:', error);
  return { message: error?.message || 'Unknown playback error', code: error?.code || 'UNKNOWN_ERROR' };
};

export const setPlaybackRate = async (rate: number) => {
  await ensurePlayerSetup();
  await TrackPlayer.setRate(rate);
};

export const setPlayerVolume = async (vol: number) => {
  await ensurePlayerSetup();
  // TrackPlayer.setVolume exists; if unsupported on some platforms, silently ignore errors || May be better implementation in the feature
  try { await TrackPlayer.setVolume(vol); } catch {}
};

export const resolvePlayableUrl = async(remoteUrl: string): Promise<string> => {
  const cached = await getCachedIfExists(remoteUrl);
  if (cached) return cached;      // use cache if available
  cacheInBackground(remoteUrl);   // kick off caching, don’t await
  return remoteUrl;               // stream remote now
}
