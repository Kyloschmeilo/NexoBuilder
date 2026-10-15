/**
 * Applies the stored or system theme to `<html>` before first paint. Runs
 * standalone as inline script source in the document `<head>`, so it cannot
 * import anything and never throws even when `localStorage` or `matchMedia`
 * are unavailable or throw.
 */
export function initializeTheme(): void {
  const root = document.documentElement;
  let choice = 'system';
  try {
    const stored = window.localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      choice = stored;
    }
  } catch {
    // Storage is unavailable; keep the "system" fallback.
  }
  let prefersDark = false;
  try {
    prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    // matchMedia is unavailable; keep the light fallback.
  }
  const resolved = choice === 'dark' || (choice === 'system' && prefersDark) ? 'dark' : 'light';
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.style.colorScheme = resolved;
}

/** Inline script source that runs {@link initializeTheme} immediately. */
export const themeInitScript = `(${initializeTheme.toString()})();`;
