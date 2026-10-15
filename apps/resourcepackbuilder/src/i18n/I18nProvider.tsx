import { useEffect, useState, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { MESSAGES_BY_LOCALE } from '@resourcepackbuilder/i18n';
import { deviceTimeZone, useLocaleStore } from './locale';

/** Provides the current language's messages to the app and keeps `<html lang>` in sync with it. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);
  const [timeZone] = useState(deviceTimeZone);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES_BY_LOCALE[locale]} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
}
