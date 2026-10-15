import { useEffect, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { messagesByLocale } from '@resourcepackbuilder/i18n';
import { timeZone, useLocaleStore } from './locale';

/** Provides the current language's messages to the app and keeps `<html lang>` in sync with it. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
}
