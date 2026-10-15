/** Locales the application ships translations for. */
export const SUPPORTED_LOCALES = ['en', 'de'] as const;

/** One of the locales the application ships translations for. */
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** The locale used when the device has no stored choice. */
export const DEFAULT_LOCALE: SupportedLocale = 'en';

/** Local storage key the device's language choice is persisted under. */
export const LOCALE_STORAGE_KEY = 'locale';

/**
 * Narrows a value to {@link SupportedLocale} when the application ships translations for it.
 *
 * @param value the value to check
 * @returns whether the value is one of {@link SUPPORTED_LOCALES}
 */
export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly unknown[]).includes(value);
}

/**
 * Reads the persisted language choice from storage.
 *
 * @param storage the storage to read from, or `undefined` when unavailable
 * @returns the stored locale, or {@link DEFAULT_LOCALE} when nothing valid is stored or reading throws
 */
export function readStoredLocale(storage: Pick<Storage, 'getItem'> | undefined): SupportedLocale {
  try {
    const stored = storage?.getItem(LOCALE_STORAGE_KEY);
    return isSupportedLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/**
 * Persists a language choice to storage.
 *
 * @param storage the storage to write to, or `undefined` when unavailable
 * @param locale the locale to persist
 */
export function writeStoredLocale(storage: Pick<Storage, 'setItem'> | undefined, locale: SupportedLocale): void {
  try {
    storage?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage access failed; the choice still applies until the app restarts.
  }
}
