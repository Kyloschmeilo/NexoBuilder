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
