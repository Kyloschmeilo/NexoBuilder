import { create } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import { DEFAULT_LOCALE, isSupportedLocale, LOCALE_STORAGE_KEY, type SupportedLocale } from '@resourcepackbuilder/i18n';

interface LocaleState {
  /** The language the app is shown in, persisted on this device. */
  locale: SupportedLocale;
}

/**
 * Keeps the plain locale string under `locale` in localStorage (the format earlier versions wrote) instead of
 * zustand's JSON envelope. Unavailable or throwing storage just means the choice is not remembered.
 */
const localeStorage: PersistStorage<LocaleState> = {
  getItem(name) {
    try {
      const stored = window.localStorage.getItem(name);
      return isSupportedLocale(stored) ? { state: { locale: stored } } : null;
    } catch {
      return null;
    }
  },
  setItem(name, value) {
    try {
      window.localStorage.setItem(name, value.state.locale);
    } catch {
      // The choice still applies until the app restarts
    }
  },
  removeItem(name) {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Nothing stored that could be removed
    }
  },
};

/** The device's language choice; read from storage synchronously when the store is created. */
export const useLocaleStore = create<LocaleState>()(
  persist(() => ({ locale: DEFAULT_LOCALE }), { name: LOCALE_STORAGE_KEY, storage: localeStorage }),
);

/** Persists a new language and switches the app to it immediately. */
export function setLocale(locale: SupportedLocale): void {
  useLocaleStore.setState({ locale });
}
