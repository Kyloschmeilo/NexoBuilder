/**
 * The appearance (light, dark or following the system), stored on this device. next-themes applies it: its provider
 * in the root layout sets the `dark` class on `<html>` before first paint.
 */
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { isOneOf } from '../lib/isOneOf';

export type ThemeChoice = 'light' | 'dark' | 'system';

/** The theme choices in the order the UI offers them, with their icons (labels: `common.themeNames.<id>`). */
export const THEME_CHOICES: ReadonlyArray<{ id: ThemeChoice; icon: LucideIcon }> = [
  { id: 'light', icon: Sun },
  { id: 'dark', icon: Moon },
  { id: 'system', icon: Monitor },
];

const THEME_IDS = THEME_CHOICES.map((choice) => choice.id);

/** The current theme choice and a setter that ignores anything but a valid choice. */
export function useThemeChoice(): { choice: ThemeChoice; icon: LucideIcon; setChoice: (value: unknown) => void } {
  const { theme, setTheme } = useTheme();
  const choice = isOneOf(THEME_IDS, theme) ? theme : 'system';
  return {
    choice,
    icon: THEME_CHOICES.find((c) => c.id === choice)?.icon ?? Monitor,
    setChoice: (value) => {
      if (isOneOf(THEME_IDS, value)) setTheme(value);
    },
  };
}
