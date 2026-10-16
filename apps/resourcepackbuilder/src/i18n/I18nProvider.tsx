import { useEffect, useState, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { MESSAGES_BY_LOCALE } from '@resourcepackbuilder/i18n';
import { useLocaleStore } from './locale';

/** Provides the current language's messages to the app and keeps `<html lang>` in sync with it. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);
  // Dates are formatted in the device's own time zone
  const [timeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES_BY_LOCALE[locale]} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
}
