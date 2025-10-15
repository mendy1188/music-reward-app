// Centralized, one-time setup + safe wrappers for TrackPlayer calls.

import TrackPlayer, {
  Capability,
  AppKilledPlaybackBehavior,
} from 'react-native-track-player';

let setupPromise: Promise<void> | null = null;

/**
 * Ensure TrackPlayer is initialized exactly once.
 * All public APIs in this file await this before touching the player.
 */
export const ensurePlayerSetup = async (): Promise<void> => {
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    // Initialize the native player
    await TrackPlayer.setupPlayer({
      waitForBuffer: true,
    });

    // Configure control-center / lockscreen capabilities
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SeekTo],
      progressUpdateEventInterval: 1,
      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      notificationCapabilities: [Capability.Play, Capability.Pause],
    });
    // (Optional) you can pre-warm any queue state here if you like.
  })();

  try {
    await setupPromise;
    // success
  } catch (e) {
    // allow retry next time if setup failed
    setupPromise = null;
    throw e;
  }
};

/** Reset player state */
export const resetPlayer = async (): Promise<void> => {
  await ensurePlayerSetup();
  await TrackPlayer.reset();
};

/** Add a single track */
export const addTrack = async (track: {
  id: string;
  url: string;
  title: string;
  artist: string;
  duration?: number;
  artwork?: string;
}): Promise<void> => {
  await ensurePlayerSetup();
  await TrackPlayer.add({
    id: track.id,
    url: track.url,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    artwork: track.artwork,
  });
};

/** Playback controls */
export const playTrack = async (): Promise<void> => {
  await ensurePlayerSetup();
  await TrackPlayer.play();
};

export const pauseTrack = async (): Promise<void> => {
  await ensurePlayerSetup();
  await TrackPlayer.pause();
};

export const seekToPosition = async (seconds: number): Promise<void> => {
  await ensurePlayerSetup();
  await TrackPlayer.seekTo(seconds);
};

export const getCurrentPosition = async (): Promise<number> => {
  await ensurePlayerSetup();
  try {
    return await TrackPlayer.getPosition();
  } catch {
    return 0;
  }
};

export const getTrackDuration = async (): Promise<number> => {
  await ensurePlayerSetup();
  try {
    return await TrackPlayer.getDuration();
  } catch {
    return 0;
  }
};

export const cleanupTrackPlayer = async (): Promise<void> => {
  // Optional: keep queue/state? Here we hard reset.
  try {
    await ensurePlayerSetup();
    await TrackPlayer.reset();
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

/** Helper to log and normalize errors */
export const handlePlaybackError = (error: any) => {
  console.error('Playback error:', error);
  return {
    message: error?.message || 'Unknown playback error',
    code: error?.code || 'UNKNOWN_ERROR',
  };
};
