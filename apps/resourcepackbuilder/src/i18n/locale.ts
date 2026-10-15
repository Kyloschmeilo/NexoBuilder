import { createTranslator } from 'next-intl';
import { create } from 'zustand';
import { messagesByLocale, readStoredLocale, writeStoredLocale, type Messages, type SupportedLocale } from '@resourcepackbuilder/i18n';

interface LocaleState {
  /** The language the app is shown in, persisted on this device. */
  locale: SupportedLocale;
  /** Persists a new language and switches the app to it immediately. */
  setLocale: (locale: SupportedLocale) => void;
}

/** The device's language choice. The app only ever runs in the browser (no prerendering), so storage is read eagerly. */
export const useLocaleStore = create<LocaleState>((set) => ({
  locale: readStoredLocale(window.localStorage),
  setLocale: (locale) => {
    writeStoredLocale(window.localStorage, locale);
    set({ locale });
  },
}));

/** The time zone next-intl formats dates in: the device's own. */
export const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Translator for code outside React components (store actions, controllers), bound to the current
 * language at call time. Components use `useTranslations` instead so they re-render on a language change.
 */
export function translator<Namespace extends keyof Messages>(namespace: Namespace) {
  const { locale } = useLocaleStore.getState();
  return createTranslator({ locale, messages: messagesByLocale[locale], namespace, timeZone });
}
