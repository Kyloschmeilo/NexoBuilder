/** Local storage key the person's theme choice is persisted under. */
export const themeStorageKey = 'theme';

/** The three theme choices a person can pick between. */
export type ThemeChoice = 'light' | 'dark' | 'system';

/** A theme choice resolved against the system preference: always concrete. */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Reports whether a value is one of the theme choices the app supports.
 *
 * @param value the value to check
 * @returns whether the value is a valid theme choice
 */
export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * Reads the persisted theme choice from storage.
 *
 * @param storage the storage to read from, or `undefined` when unavailable
 * @returns the stored choice, or "system" when nothing is stored, the stored
 *   value is not a recognised choice, or reading storage throws
 */
export function readStoredThemeChoice(storage: Pick<Storage, 'getItem'> | undefined): ThemeChoice {
  if (!storage) {
    return 'system';
  }
  try {
    const stored = storage.getItem(themeStorageKey);
    return isThemeChoice(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Persists a theme choice to storage.
 *
 * @param storage the storage to write to, or `undefined` when unavailable
 * @param choice the choice to persist
 */
export function writeStoredThemeChoice(
  storage: Pick<Storage, 'setItem'> | undefined,
  choice: ThemeChoice,
): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(themeStorageKey, choice);
  } catch {
    // Storage access failed; the choice still applies to the current page
    // through in-memory state.
  }
}

/**
 * Resolves a theme choice against the current system preference.
 *
 * @param choice the theme choice
 * @param prefersDark whether the system currently prefers dark
 * @returns the concrete theme the choice resolves to
 */
export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): ResolvedTheme {
  return choice === 'system' ? (prefersDark ? 'dark' : 'light') : choice;
}

/**
 * Applies a resolved theme to the document root: the `dark` class Tailwind's
 * class-based dark variant reads, and the `color-scheme` CSS property.
 *
 * @param root the document root element
 * @param resolved the resolved theme to apply
 */
export function applyResolvedTheme(root: HTMLElement, resolved: ResolvedTheme): void {
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

/**
 * Reports whether the system currently prefers dark appearance.
 *
 * @param win the window to query, or `undefined` when unavailable
 * @returns whether the system prefers dark, or `false` when `matchMedia` is
 *   unavailable or querying it throws
 */
export function systemPrefersDark(win: Pick<Window, 'matchMedia'> | undefined): boolean {
  if (!win?.matchMedia) {
    return false;
  }
  try {
    return win.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}
