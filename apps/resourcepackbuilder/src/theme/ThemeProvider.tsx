'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  applyResolvedTheme,
  readStoredThemeChoice,
  resolveTheme,
  systemPrefersDark,
  writeStoredThemeChoice,
  type ResolvedTheme,
  type ThemeChoice,
} from './theme';

/** The theme choice and its resolved appearance, plus a setter to change it. */
export interface ThemeContextValue {
  /** The choice the person picked, or "system" to follow the OS preference. */
  readonly choice: ThemeChoice;
  /** The concrete appearance the current choice resolves to. */
  readonly resolvedTheme: ResolvedTheme;
  /** Stores a new theme choice and applies it to the document immediately. */
  readonly setTheme: (choice: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Follows the system preference with a single media-query listener. */
function subscribeSystemTheme(onChange: () => void): () => void {
  let media: MediaQueryList;
  try {
    media = window.matchMedia(DARK_QUERY);
  } catch {
    return () => undefined;
  }
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

const prefersDarkNow = () => systemPrefersDark(window);
const prefersDarkOnServer = () => false;

/**
 * Provides the current theme choice and resolved appearance to the app, and keeps `<html>` in sync with it. Follows
 * system preference changes while the choice is "system".
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>(() => readStoredThemeChoice(window.localStorage));
  const prefersDark = useSyncExternalStore(subscribeSystemTheme, prefersDarkNow, prefersDarkOnServer);
  const resolvedTheme = resolveTheme(choice, prefersDark);

  useEffect(() => {
    applyResolvedTheme(document.documentElement, resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    writeStoredThemeChoice(window.localStorage, next);
    setChoice(next);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({ choice, resolvedTheme, setTheme }), [choice, resolvedTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Reads the current theme choice, its resolved appearance and the setter; throws outside a {@link ThemeProvider}. */
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within a ThemeProvider');
  return value;
}
