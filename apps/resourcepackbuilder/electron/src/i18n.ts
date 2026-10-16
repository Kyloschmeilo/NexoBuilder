/**
 * Texts of the desktop program (menus, native dialogs, test-server messages) from `@resourcepackbuilder/i18n/desktop`,
 * bundled into the main process. The UI reports its language via `app:set-locale`; until then English is used.
 */
import { toDesktopErrorPayload } from '@resourcepackbuilder/desktop-contract';
import {
  createDesktopTranslators,
  DEFAULT_LOCALE,
  type DesktopMessageKey,
  type MessageValues,
  type SupportedLocale,
} from '@resourcepackbuilder/i18n/desktop';

let current: SupportedLocale = DEFAULT_LOCALE;
let translators = createDesktopTranslators(current);

/** Switches the language; returns whether it changed (the menu is then rebuilt). */
export function setLocale(locale: SupportedLocale): boolean {
  if (locale === current) return false;
  current = locale;
  translators = createDesktopTranslators(locale);
  return true;
}

/** The text for a key of the `desktop` namespace in the current language. */
export function t(key: DesktopMessageKey, values?: MessageValues): string {
  return translators.t(key, values as never);
}

/** A caught error in the current language (for messages in the test server's state and console). */
export function describeError(err: unknown): string {
  const { code, args } = toDesktopErrorPayload(err);
  return translators.tError(code, args as never);
}
