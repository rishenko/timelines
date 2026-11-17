import { useCallback, useEffect, useState } from 'react';
import { applyTheme, clearTheme, loadTheme, saveTheme, type ThemeSetting } from '../lib/theme.ts';

/**
 * The app theme, applied to :root. The timeline's default preset applies until
 * the reader picks a theme; their choice is then saved in the browser and wins
 * on every timeline, until they reset it.
 */
export function useTheme(timelineDefault?: string) {
  const [theme, setThemeState] = useState<ThemeSetting>(() => loadTheme(timelineDefault));
  useEffect(() => applyTheme(theme.colors), [theme]);
  const setTheme = useCallback((t: ThemeSetting) => {
    saveTheme(t);
    setThemeState(t);
  }, []);
  const resetTheme = useCallback(() => {
    clearTheme();
    setThemeState(loadTheme(timelineDefault));
  }, [timelineDefault]);
  return [theme, setTheme, resetTheme] as const;
}
