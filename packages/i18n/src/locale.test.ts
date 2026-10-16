import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, isSupportedLocale, SUPPORTED_LOCALES } from './locale';

describe('SUPPORTED_LOCALES', () => {
  it('ships English and German with English as the default', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'de']);
    expect(DEFAULT_LOCALE).toBe('en');
  });
});

describe('isSupportedLocale', () => {
  it('accepts the shipped locales only', () => {
    expect(isSupportedLocale('de')).toBe(true);
    expect(isSupportedLocale('fr')).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
  });
});
