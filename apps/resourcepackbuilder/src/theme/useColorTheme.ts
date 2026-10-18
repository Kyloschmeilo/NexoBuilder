/**
 * The colour theme chosen on this device: a store persisted in localStorage that keeps `data-color-theme` on `<html>`
 * in sync. The boot script in the root layout sets the attribute before first paint; this store takes over from there.
 */
import { create } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import { COLOR_THEME_ATTRIBUTE, COLOR_THEME_STORAGE_KEY, DEFAULT_COLOR_THEME, isColorTheme, type ColorTheme } from './colorThemes';

interface ColorThemeState {
  /** The palette the app is shown in. */
  colorTheme: ColorTheme;
}

/**
 * Keeps the plain theme id under `colorTheme` in localStorage (the format the boot script reads) instead of zustand's
 * JSON envelope. Unavailable or throwing storage just means the choice is not remembered.
 */
const colorThemeStorage: PersistStorage<ColorThemeState> = {
  getItem(name) {
    try {
      const stored = window.localStorage.getItem(name);
      return isColorTheme(stored) ? { state: { colorTheme: stored } } : null;
    } catch {
      return null;
    }
  },
  setItem(name, value) {
    try {
      window.localStorage.setItem(name, value.state.colorTheme);
    } catch {
      // The choice still applies until the app restarts
    }
  },
  removeItem(name) {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Nothing stored that could be removed
    }
  },
};

/** Sets the theme attribute on `<html>`; a no-op outside the browser. */
function applyColorTheme(theme: ColorTheme): void {
  if (typeof document !== 'undefined') document.documentElement.setAttribute(COLOR_THEME_ATTRIBUTE, theme);
}

/** The device's colour theme; read from storage synchronously when the store is created. */
export const useColorThemeStore = create<ColorThemeState>()(
  persist(() => ({ colorTheme: DEFAULT_COLOR_THEME }), { name: COLOR_THEME_STORAGE_KEY, storage: colorThemeStorage }),
);

applyColorTheme(useColorThemeStore.getState().colorTheme);
useColorThemeStore.subscribe((state) => applyColorTheme(state.colorTheme));

/** Persists a colour theme and applies it immediately; anything but a valid theme id is ignored. */
export function setColorTheme(value: unknown): void {
  if (isColorTheme(value)) useColorThemeStore.setState({ colorTheme: value });
}

/** The current colour theme and a setter that ignores anything but a valid theme id. */
export function useColorTheme(): { colorTheme: ColorTheme; setColorTheme: (value: unknown) => void } {
  const colorTheme = useColorThemeStore((state) => state.colorTheme);
  return { colorTheme, setColorTheme };
}
