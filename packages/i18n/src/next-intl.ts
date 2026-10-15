import type {} from 'next-intl';
import type { SupportedLocale } from './locale';
import type { Messages } from './messages';

declare module 'next-intl' {
  /** Types every `useTranslations` call, in every package that imports this one, by the catalogue and the locales. */
  interface AppConfig {
    Messages: Messages;
    Locale: SupportedLocale;
  }
}
