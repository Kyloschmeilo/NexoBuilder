// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  applyResolvedTheme,
  isThemeChoice,
  readStoredThemeChoice,
  resolveTheme,
  systemPrefersDark,
  themeStorageKey,
  writeStoredThemeChoice,
} from './theme';

describe('themeStorageKey', () => {
  it('is "theme"', () => {
    expect(themeStorageKey).toBe('theme');
  });
});

describe('isThemeChoice', () => {
  it('accepts "light", "dark" and "system"', () => {
    expect(isThemeChoice('light')).toBe(true);
    expect(isThemeChoice('dark')).toBe(true);
    expect(isThemeChoice('system')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isThemeChoice('sepia')).toBe(false);
    expect(isThemeChoice(undefined)).toBe(false);
    expect(isThemeChoice(null)).toBe(false);
    expect(isThemeChoice(42)).toBe(false);
  });
});

/** Builds a fake `Storage` backed by an in-memory map. */
function fakeStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: () => null,
    get length() {
      return store.size;
    },
  };
}

describe('readStoredThemeChoice', () => {
  it('reads a valid stored choice', () => {
    expect(readStoredThemeChoice(fakeStorage({ [themeStorageKey]: 'dark' }))).toBe('dark');
  });

  it('falls back to "system" when nothing is stored', () => {
    expect(readStoredThemeChoice(fakeStorage())).toBe('system');
  });

  it('falls back to "system" when the stored value is not a recognised choice', () => {
    expect(readStoredThemeChoice(fakeStorage({ [themeStorageKey]: 'sepia' }))).toBe('system');
  });

  it('falls back to "system" when storage is undefined', () => {
    expect(readStoredThemeChoice(undefined)).toBe('system');
  });

  it('falls back to "system" when storage access throws', () => {
    const throwing: Pick<Storage, 'getItem'> = {
      /** Always throws, simulating storage that rejects access. */
      getItem: () => {
        throw new Error('storage disabled');
      },
    };
    expect(readStoredThemeChoice(throwing)).toBe('system');
  });
});

describe('writeStoredThemeChoice', () => {
  it('persists the choice under the storage key', () => {
    const storage = fakeStorage();
    writeStoredThemeChoice(storage, 'dark');
    expect(storage.getItem(themeStorageKey)).toBe('dark');
  });

  it('does nothing when storage is undefined', () => {
    expect(() => {
      writeStoredThemeChoice(undefined, 'dark');
    }).not.toThrow();
  });

  it('swallows a storage access error', () => {
    const throwing: Pick<Storage, 'setItem'> = {
      /** Always throws, simulating storage that rejects access. */
      setItem: () => {
        throw new Error('storage disabled');
      },
    };
    expect(() => {
      writeStoredThemeChoice(throwing, 'dark');
    }).not.toThrow();
  });
});

describe('resolveTheme', () => {
  it('resolves "light" and "dark" to themselves regardless of system preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('light', false)).toBe('light');
    expect(resolveTheme('dark', true)).toBe('dark');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('resolves "system" to the system preference', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('applyResolvedTheme', () => {
  it('adds the dark class and sets color-scheme for "dark"', () => {
    const root = document.createElement('html');
    applyResolvedTheme(root, 'dark');
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.style.colorScheme).toBe('dark');
  });

  it('removes the dark class and sets color-scheme for "light"', () => {
    const root = document.createElement('html');
    root.classList.add('dark');
    applyResolvedTheme(root, 'light');
    expect(root.classList.contains('dark')).toBe(false);
    expect(root.style.colorScheme).toBe('light');
  });
});

describe('systemPrefersDark', () => {
  it('reports the matchMedia result', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    const win = { matchMedia } as unknown as Window;
    expect(systemPrefersDark(win)).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });

  it('reports false when matchMedia is unavailable', () => {
    expect(systemPrefersDark(undefined)).toBe(false);
    expect(systemPrefersDark({} as Window)).toBe(false);
  });

  it('reports false when matchMedia throws', () => {
    const win = {
      matchMedia: () => {
        throw new Error('not supported');
      },
    } as unknown as Window;
    expect(systemPrefersDark(win)).toBe(false);
  });
});
