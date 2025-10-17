import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ensurePlayerSetup } from '../services/audioService';
import ErrorBoundary from '../components/util/ErrorBoundary';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMusicStore } from '../stores/musicStore';
import { useUserStore } from '../stores/userStore';

//Register Trackplayer once at app entry
import TrackPlayer from 'react-native-track-player';
import { playbackService } from '../services/playbackService';
TrackPlayer.registerPlaybackService(() => playbackService);

export default function RootLayout() {
  useEffect(() => {
    (async () => {
      try {
        await ensurePlayerSetup(); // ⬅️ call the new initializer
      } catch (error) {
        console.error('Failed to setup TrackPlayer:', error);
      }
    })();
  }, []);

  // useEffect(() => {
  //   (async () => {
  //     // 1) clear both persisted keys
  //     await AsyncStorage.multiRemove(['music-store', 'user-store']);
  
  //     // 2) reset in-memory state to baseline
  //     await useMusicStore.getState().resetProgress();
  //     await useUserStore.getState().resetProgress();
  
  //     console.log('All stores and storage reset');
  //   })();
  // }, []);
  
// useEffect(() => {
//   AsyncStorage.clear().then(() => console.log('AsyncStorage cleared'));
// }, []);

  return (
    <ErrorBoundary>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(modals)"
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack>
    </ErrorBoundary>
  );
}
