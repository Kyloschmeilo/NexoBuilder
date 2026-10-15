import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, readStoredLocale, SUPPORTED_LOCALES, writeStoredLocale } from './locale';

/** A minimal in-memory storage. */
function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe('SUPPORTED_LOCALES', () => {
  it('ships English and German with English as the default', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'de']);
    expect(DEFAULT_LOCALE).toBe('en');
  });
});

describe('readStoredLocale', () => {
  it('returns the stored locale when it is supported', () => {
    expect(readStoredLocale(memoryStorage({ [LOCALE_STORAGE_KEY]: 'de' }))).toBe('de');
  });

  it('falls back to English when nothing or an unsupported locale is stored', () => {
    expect(readStoredLocale(memoryStorage())).toBe('en');
    expect(readStoredLocale(memoryStorage({ [LOCALE_STORAGE_KEY]: 'fr' }))).toBe('en');
    expect(readStoredLocale(undefined)).toBe('en');
  });

  it('falls back to English when reading storage throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('denied');
      },
    };
    expect(readStoredLocale(throwing)).toBe('en');
  });
});

describe('writeStoredLocale', () => {
  it('persists the locale so it is read back', () => {
    const storage = memoryStorage();
    writeStoredLocale(storage, 'de');
    expect(readStoredLocale(storage)).toBe('de');
  });

  it('does not throw when writing storage throws', () => {
    const throwing = {
      setItem: () => {
        throw new Error('denied');
      },
    };
    expect(() => writeStoredLocale(throwing, 'de')).not.toThrow();
  });
});
