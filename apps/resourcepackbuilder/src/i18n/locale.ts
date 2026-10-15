import { create } from 'zustand';
import { readStoredLocale, SUPPORTED_LOCALES, writeStoredLocale, type SupportedLocale } from '@resourcepackbuilder/i18n';

interface LocaleState {
  /** The language the app is shown in, persisted on this device. */
  locale: SupportedLocale;
}

/** The device's language choice; `loadStoredLocale()` reads it at startup. */
export const useLocaleStore = create<LocaleState>(() => ({ locale: SUPPORTED_LOCALES[0] }));

/** Applies the language stored on this device (called once at startup). */
export function loadStoredLocale(): void {
  useLocaleStore.setState({ locale: readStoredLocale(window.localStorage) });
}

/** Persists a new language and switches the app to it immediately. */
export function setLocale(locale: SupportedLocale): void {
  writeStoredLocale(window.localStorage, locale);
  useLocaleStore.setState({ locale });
}

/** The time zone next-intl formats dates in: the device's own. */
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
