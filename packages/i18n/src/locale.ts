/** Locales the application ships translations for. */
export const supportedLocales = ['en', 'de'] as const;

/** One of the locales the application ships translations for. */
export type SupportedLocale = (typeof supportedLocales)[number];

/** The locale used when the device has no stored choice. */
export const defaultLocale: SupportedLocale = 'en';

/** Local storage key the device's language choice is persisted under. */
export const localeStorageKey = 'locale';

/**
 * Narrows a value to {@link SupportedLocale} when the application ships translations for it.
 *
 * @param value the value to check
 * @returns whether the value is one of {@link supportedLocales}
 */
export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return (supportedLocales as readonly unknown[]).includes(value);
}

/**
 * Reads the persisted language choice from storage.
 *
 * @param storage the storage to read from, or `undefined` when unavailable
 * @returns the stored locale, or {@link defaultLocale} when nothing valid is stored or reading throws
 */
export function readStoredLocale(storage: Pick<Storage, 'getItem'> | undefined): SupportedLocale {
  try {
    const stored = storage?.getItem(localeStorageKey);
    return isSupportedLocale(stored) ? stored : defaultLocale;
  } catch {
    return defaultLocale;
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
    storage?.setItem(localeStorageKey, locale);
  } catch {
    // Storage access failed; the choice still applies until the app restarts.
  }
}
