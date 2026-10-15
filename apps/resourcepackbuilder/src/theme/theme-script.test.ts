// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initializeTheme, themeInitScript } from './theme-script';
import { themeStorageKey } from './theme';

afterEach(() => {
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = '';
  window.localStorage.clear();
  Reflect.deleteProperty(window, 'matchMedia');
  vi.restoreAllMocks();
});

/** Stubs `window.matchMedia`, which jsdom does not implement, with a fixed result or a throw. */
function stubMatchMedia(result: { matches: boolean } | (() => never)): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: typeof result === 'function' ? result : () => result,
  });
}

describe('initializeTheme', () => {
  it('applies dark when "dark" is stored', () => {
    window.localStorage.setItem(themeStorageKey, 'dark');
    initializeTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });


  it('applies light when "light" is stored', () => {
    window.localStorage.setItem(themeStorageKey, 'light');
    initializeTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('falls back to the system preference when "system" is stored', () => {
    window.localStorage.setItem(themeStorageKey, 'system');
    stubMatchMedia({ matches: true });
    initializeTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('falls back to the system preference when nothing is stored', () => {
    stubMatchMedia({ matches: false });
    initializeTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('falls back to light when localStorage.getItem throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    stubMatchMedia({ matches: true });
    expect(() => {
      initializeTheme();
    }).not.toThrow();
    // "system" is the fallback choice, so it still follows the system
    // preference mocked above.
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('falls back to light when matchMedia throws', () => {
    window.localStorage.setItem(themeStorageKey, 'system');
    stubMatchMedia(() => {
      throw new Error('not supported');
    });
    expect(() => {
      initializeTheme();
    }).not.toThrow();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

describe('themeInitScript', () => {
  it('is the source of initializeTheme wrapped as an immediately invoked expression', () => {
    expect(themeInitScript).toContain('initializeTheme');
    expect(themeInitScript.trim().startsWith('(')).toBe(true);
    expect(themeInitScript.trim().endsWith(')();')).toBe(true);
  });

  it('applies the theme when executed standalone, exactly like a browser running the inline script', () => {
    window.localStorage.setItem(themeStorageKey, 'dark');
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call -- exercises the exact source embedded in <head>.
    new Function(themeInitScript)();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
