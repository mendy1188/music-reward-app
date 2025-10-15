// Root layout for Expo Router
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ensurePlayerSetup } from '../services/audioService'; // ⬅️ update import

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

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="(modals)"
        options={{ presentation: 'modal', headerShown: false }}
      />
    </Stack>
  );
}
