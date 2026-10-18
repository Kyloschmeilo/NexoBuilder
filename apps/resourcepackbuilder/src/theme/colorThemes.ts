/**
 * The colour themes of the app and how the choice is stored. A theme is applied as `data-color-theme` on `<html>`; the
 * palettes themselves live in `@resourcepackbuilder/ui/styles.css`. Light, dark or system is a separate choice
 * (next-themes, see `useThemeChoice`).
 */

/** The colour themes in the order the UI offers them (labels: `dialogs.settings.colorThemes.<id>`). */
export const COLOR_THEMES = ['deepslate', 'amethyst', 'copper', 'prismarine', 'crimson'] as const;

export type ColorTheme = (typeof COLOR_THEMES)[number];

/** The theme of a new install. */
export const DEFAULT_COLOR_THEME: ColorTheme = 'deepslate';

/** The localStorage key holding the plain theme id. */
export const COLOR_THEME_STORAGE_KEY = 'colorTheme';

/** The `<html>` attribute that selects the palette. */
export const COLOR_THEME_ATTRIBUTE = 'data-color-theme';

/** Whether `value` is the id of a colour theme. */
export function isColorTheme(value: unknown): value is ColorTheme {
  return COLOR_THEMES.some((theme) => theme === value);
}

/**
 * A tiny script for the document head that sets the stored theme on `<html>` before first paint, so the page never
 * flashes in the default palette. Unknown values and unavailable storage fall back to the default theme.
 */
export const COLOR_THEME_BOOT_SCRIPT = `(function(){var t=${JSON.stringify(DEFAULT_COLOR_THEME)};try{var s=window.localStorage.getItem(${JSON.stringify(
  COLOR_THEME_STORAGE_KEY,
)});if(${JSON.stringify(COLOR_THEMES)}.indexOf(s)>=0)t=s}catch(e){}document.documentElement.setAttribute(${JSON.stringify(
  COLOR_THEME_ATTRIBUTE,
)},t)})()`;
