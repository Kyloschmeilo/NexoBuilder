/**
 * Types every `useTranslations`/`createTranslator` call by the catalogue and the locales. Packages opt in through
 * their tsconfig: `"types": ["@resourcepackbuilder/i18n/next-intl"]`.
 */
import type { SupportedLocale } from './locale';
import type { Messages } from './messages';

declare module 'next-intl' {
  interface AppConfig {
    Messages: Messages;
    Locale: SupportedLocale;
  }
}
