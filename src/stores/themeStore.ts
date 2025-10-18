import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeStore {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggleDark: () => void; // quick flip between light/dark
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: 'system',
      setMode: (m) => set({ mode: m }),
      toggleDark: () => set({ mode: get().mode === 'dark' ? 'light' : 'dark' }),
    }),
    {
      name: 'theme-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);

export const computeIsDark = (pref: ThemeMode, system: ColorSchemeName) =>
  pref === 'dark' || (pref === 'system' && system === 'dark');
