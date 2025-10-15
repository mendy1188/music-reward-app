import 'expo-router/entry';
import TrackPlayer from 'react-native-track-player';

// Point to our service module:
TrackPlayer.registerPlaybackService(() => require('./src/services/playbackService').default);
