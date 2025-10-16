// Root layout for Expo Router
import '../lib/track-player-service'; // <-- side-effect import
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ensurePlayerSetup } from '../services/audioService';
import ErrorBoundary from '../components/util/ErrorBoundary';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMusicStore } from '../stores/musicStore';
import { useUserStore } from '../stores/userStore';

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
