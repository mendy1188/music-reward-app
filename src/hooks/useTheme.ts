import { useColorScheme } from 'react-native';
import { useMemo } from 'react';
import { THEMES } from '../constants/theme';
import { computeIsDark, useThemeStore } from '../stores/themeStore';

export const useTheme = () => {
  const scheme = useColorScheme(); // 'light' | 'dark' | null
  const mode = useThemeStore((s) => s.mode);
  const isDark = computeIsDark(mode, scheme);
  const theme = useMemo(() => (isDark ? THEMES.dark : THEMES.light), [isDark]);
  return { theme, isDark, mode };
};
