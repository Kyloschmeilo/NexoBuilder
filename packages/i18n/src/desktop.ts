/**
 * Texts of the desktop program's main process: the `desktop` namespace (menus, native dialogs, test-server messages)
 * and `desktopErrors` (errors it reports to the UI, which the UI translates from its own catalogue). Bundled into the
 * Electron main process; the renderer's catalogue (`MESSAGES_BY_LOCALE`) leaves `desktop` out.
 */
import { createTranslator } from 'use-intl/core';
import { DEFAULT_LOCALE, isSupportedLocale, SUPPORTED_LOCALES, type SupportedLocale } from './locale';
import de_desktop from './messages/de/desktop.json' with { type: 'json' };
import de_desktopErrors from './messages/de/desktopErrors.json' with { type: 'json' };
import en_desktop from './messages/en/desktop.json' with { type: 'json' };
import en_desktopErrors from './messages/en/desktopErrors.json' with { type: 'json' };

export { DEFAULT_LOCALE, isSupportedLocale, SUPPORTED_LOCALES, type SupportedLocale };

const en = { desktop: en_desktop, desktopErrors: en_desktopErrors };

/** The desktop program's catalogue, derived from the English source. */
export type DesktopMessages = typeof en;

/** The desktop catalogue of every supported locale. */
export const DESKTOP_MESSAGES_BY_LOCALE: Record<SupportedLocale, DesktopMessages> = {
  en,
  de: { desktop: de_desktop, desktopErrors: de_desktopErrors } satisfies DesktopMessages,
};

/** Values for the ICU placeholders of a message. */
export type MessageValues = Record<string, string | number>;

/** Translators for one locale: `t` for the `desktop` namespace, `tError` for `desktopErrors`. */
export function createDesktopTranslators(locale: SupportedLocale) {
  const messages = DESKTOP_MESSAGES_BY_LOCALE[locale];
  return {
    t: createTranslator({ locale, messages, namespace: 'desktop' }),
    tError: createTranslator({ locale, messages, namespace: 'desktopErrors' }),
  };
}

/** A message key of the `desktop` namespace, e.g. `'menu.file'`. */
export type DesktopMessageKey = Parameters<ReturnType<typeof createDesktopTranslators>['t']>[0];
