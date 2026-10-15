'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
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

/** A theme choice together with the appearance it currently resolves to. */
interface ThemeSnapshot {
  /** The choice the person picked, or "system" to follow the OS preference. */
  readonly choice: ThemeChoice;
  /** The concrete appearance the choice currently resolves to. */
  readonly resolvedTheme: ResolvedTheme;
}

/** Carries the current theme choice and setter to descendants, `null` outside a {@link ThemeProvider}. */
const ThemeContext = createContext<ThemeContextValue | null>(null);

/** The snapshot rendered on the server and on the client's first render, before storage can be read. */
const serverSnapshot: ThemeSnapshot = { choice: 'system', resolvedTheme: 'light' };

/**
 * The most recently computed snapshot, reused while nothing has changed so
 * that `useSyncExternalStore` sees a referentially stable value.
 */
let cachedSnapshot: ThemeSnapshot | null = null;

/** Functions subscribed to theme changes through `useSyncExternalStore`. */
const listeners = new Set<() => void>();

/**
 * Reads the current theme choice and resolved appearance from storage and
 * the system preference.
 *
 * @returns the current theme snapshot, reusing the previous one when nothing
 *   changed
 */
function getSnapshot(): ThemeSnapshot {
  const choice = readStoredThemeChoice(window.localStorage);
  const resolvedTheme = resolveTheme(choice, systemPrefersDark(window));
  if (cachedSnapshot?.choice !== choice || cachedSnapshot.resolvedTheme !== resolvedTheme) {
    cachedSnapshot = { choice, resolvedTheme };
  }
  return cachedSnapshot;
}

/**
 * Returns the snapshot to render on the server and on the client's first
 * render, before hydration can read storage.
 *
 * @returns the server-safe theme snapshot
 */
function getServerSnapshot(): ThemeSnapshot {
  return serverSnapshot;
}

/** Notifies every subscribed listener that the theme snapshot may have changed. */
function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Subscribes a listener to theme changes: a call to {@link setThemeChoice}
 * and, while the browser reports one, a system preference change.
 *
 * @param listener called after the theme may have changed
 * @returns a function that removes the subscription
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  let media: MediaQueryList | undefined;
  try {
    media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', listener);
  } catch {
    media = undefined;
  }
  return () => {
    listeners.delete(listener);
    media?.removeEventListener('change', listener);
  };
}

/**
 * Persists a new theme choice and notifies subscribers so the app and
 * `<html>` update immediately.
 *
 * @param choice the choice to apply
 */
function setThemeChoice(choice: ThemeChoice): void {
  writeStoredThemeChoice(window.localStorage, choice);
  cachedSnapshot = { choice, resolvedTheme: resolveTheme(choice, systemPrefersDark(window)) };
  notifyListeners();
}

/**
 * Provides the current theme choice and resolved appearance to the app, and
 * keeps `<html>` in sync with it. Follows system preference changes while
 * the choice is "system".
 *
 * @param props the provider props
 * @param props.children the app content
 * @returns the provider around the content
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    applyResolvedTheme(document.documentElement, snapshot.resolvedTheme);
  }, [snapshot.resolvedTheme]);

  const setTheme = useCallback((choice: ThemeChoice) => {
    setThemeChoice(choice);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ choice: snapshot.choice, resolvedTheme: snapshot.resolvedTheme, setTheme }),
    [snapshot.choice, snapshot.resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Reads the current theme choice, its resolved appearance and the setter to
 * change it.
 *
 * @returns the current theme context value
 * @throws when called outside a {@link ThemeProvider}
 */
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return value;
}
