// Centralized, one-time setup + safe wrappers for TrackPlayer calls.

import TrackPlayer, {
  Capability,
  AppKilledPlaybackBehavior,
} from 'react-native-track-player';

let setupPromise: Promise<void> | null = null;

/** Ensure TrackPlayer is initialized exactly once. */
export const ensurePlayerSetup = async (): Promise<void> => {
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    await TrackPlayer.setupPlayer({ waitForBuffer: true });

    await TrackPlayer.updateOptions({
      // Keep UX honest: only expose what you actually support
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SeekTo,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause],
      // fires progress events more frequently to your hooks
      progressUpdateEventInterval: 1,

      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      notificationCapabilities: [Capability.Play, Capability.Pause],
      // iOS: ensure Background Modes → Audio is enabled in the Xcode target
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
