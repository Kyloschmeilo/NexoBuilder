// @ts-check
/**
 * Texts of the desktop program (menus, native dialogs, test-server and share messages).
 *
 * They live in the shared catalogues as the `desktop` namespace (`packages/i18n/src/messages/<locale>/desktop.json`);
 * the packaged app carries a copy of those files (see `electron-builder.yml`). The UI reports its language via
 * `app:set-locale`; until then English is used. Placeholders are plain `{name}` arguments.
 */
const { app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

/** @typedef {typeof import('../../../packages/i18n/src/messages/en/desktop.json')} DesktopMessages */
/** @typedef {{ [K in keyof DesktopMessages]: `${K}.${keyof DesktopMessages[K] & string}` }[keyof DesktopMessages]} MessageKey */
/** @typedef {Record<string, string | number>} MessageArgs */

const DEFAULT_LOCALE = 'en';
const MESSAGES_DIR = app.isPackaged
  ? path.join(__dirname, 'messages')
  : path.join(__dirname, '..', '..', '..', 'packages', 'i18n', 'src', 'messages');

/** @type {Map<string, Record<string, Record<string, string>>>} */
const catalogues = new Map(
  fs
    .readdirSync(MESSAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => [entry.name, JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, entry.name, 'desktop.json'), 'utf8'))]),
);

let current = DEFAULT_LOCALE;
/** @type {Set<(locale: string) => void>} */
const listeners = new Set();

/**
 * Switches the language (unknown values are ignored) and notifies listeners, e.g. to rebuild the menu.
 * @param {unknown} locale
 */
function setLocale(locale) {
  if (typeof locale !== 'string' || !catalogues.has(locale) || locale === current) return;
  current = locale;
  for (const listener of listeners) listener(locale);
}

/** @param {(locale: string) => void} listener */
function onLocaleChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * @param {string} locale
 * @param {string} key
 */
function lookup(locale, key) {
  const [group, name] = key.split('.');
  return catalogues.get(locale)?.[group]?.[name];
}

/**
 * The text for `key` in the current language, with `{name}` placeholders filled from `args`.
 * @param {MessageKey} key
 * @param {MessageArgs} [args]
 */
function t(key, args = {}) {
  const template = lookup(current, key) ?? lookup(DEFAULT_LOCALE, key) ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in args ? String(args[name]) : match));
}

module.exports = { setLocale, onLocaleChange, t };
