import { useEffect, useState, type ReactNode } from 'react';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { MESSAGES_BY_LOCALE } from '@resourcepackbuilder/i18n';
import { DEFAULT_UI_LABELS, type UiLabels, UiLabelsProvider } from '@resourcepackbuilder/ui';
import { useLocaleStore } from './locale';

/** Gives the ui components their own texts (close buttons, spinners, editor primitive controls) in the current language. */
function TranslatedUiLabels({ children }: { children: ReactNode }) {
  const t = useTranslations('ui.labels');
  const labels = Object.fromEntries(Object.keys(DEFAULT_UI_LABELS).map((key) => [key, t(key as keyof UiLabels)])) as unknown as UiLabels;
  return <UiLabelsProvider labels={labels}>{children}</UiLabelsProvider>;
}

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
      <TranslatedUiLabels>{children}</TranslatedUiLabels>
    </NextIntlClientProvider>
  );
}
