import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import type { ThemeChoice } from './theme';

/** The icon of each theme choice. */
export const THEME_ICONS: Record<ThemeChoice, LucideIcon> = { light: Sun, dark: Moon, system: Monitor };

/** The theme choices in the order the UI offers them, with their icons (labels: `common.themeNames.<id>`). */
export const THEME_CHOICES: ReadonlyArray<{ id: ThemeChoice; icon: LucideIcon }> = (['light', 'dark', 'system'] as const).map((id) => ({
  id,
  icon: THEME_ICONS[id],
}));
