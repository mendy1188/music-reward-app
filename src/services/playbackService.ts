import TrackPlayer, { Event } from 'react-native-track-player';

export async function playbackService() {
	TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
	TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
	TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) =>
		TrackPlayer.seekTo(position)
	);
	TrackPlayer.addEventListener(Event.RemoteDuck, async ({ paused }) => {
		// Phone call / Siri / maps prompts, etc.
		if (paused) await TrackPlayer.pause();
	});
	TrackPlayer.addEventListener(Event.RemoteNext, async () => {
		// Noop (single-track app) or implement queue later
	});
	TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
		// Noop or implement
	});
	TrackPlayer.addEventListener(Event.RemoteStop, async () => {
		try {
			await TrackPlayer.stop();
		} catch {}
	});
}
