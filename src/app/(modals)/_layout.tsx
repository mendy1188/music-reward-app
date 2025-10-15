// Modal layout for player and other modals
import { Stack } from 'expo-router';
import { THEME } from '../../constants/theme';

export default function ModalLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: THEME.colors.background,
        },
        headerTintColor: THEME.colors.text.primary,
        presentation: 'modal',
      }}
    >
      <Stack.Screen
        name="player"
        options={{
          title: 'Now Playing',
          headerBackTitle: 'Close',
        }}
      />
    </Stack>
  );
}