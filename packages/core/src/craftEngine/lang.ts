/**
 * Translations of a CraftEngine pack.
 *
 * Display names of items (`item.translations`): an item with translations gets
 * `data.item_name: <lang:item.<namespace>.<item id>>`, and the export writes its names into the pack's lang files
 * (`lang:` sections, which CraftEngine puts into the resource pack's assets/minecraft/lang/<locale>.json). The
 * display name is the `en_us` text unless a translation sets it, so a client in any other language falls back to it.
 * A custom block also gets its client name, `block_name:<block id>`, from the same texts (CraftEngine turns the key
 * into the block's real translation key).
 *
 * Project-wide (`Project.craftEngine`): free client lang keys (`lang`, locale → key → text; the locale `all` writes a
 * key into every language) and the server-side translations (`translations`, read by `<i18n:key>` with the server's
 * language and `<l10n:key>` with each player's), both written as they are.
 */
import { field, resolveFields } from '../form/build';
import type { MapField } from '../form/fields';
import type { Item, Project } from '../project/types';
import { CE_LOCALES } from './form/options';

/** A Minecraft locale as lang files name it ("en_us", "de_de", "enws"). */
export const CE_LOCALE_PATTERN = /^[a-z0-9_]+$/;

/** The locale whose text a client shows when its own language has none. */
const FALLBACK_LOCALE = 'en_us';

export interface CraftEngineTranslations {
  /** Text per locale (null = the item has no translations) */
  texts: Record<string, string> | null;
  /** Locales left out because CraftEngine cannot name a lang file after them */
  invalidLocales: string[];
}

/** The lang key of an item's display name, e.g. "item.ruby.ruby_sword". */
export function craftEngineLangKey(project: Pick<Project, 'namespace'>, item: Pick<Item, 'itemId'>): string {
  return `item.${project.namespace}.${item.itemId}`;
}

/** The translations the export writes for an item: those with a text, with the display name as `en_us`. */
export function craftEngineTranslations(item: Item): CraftEngineTranslations {
  const texts: Record<string, string> = {};
  const invalidLocales: string[] = [];
  for (const [locale, text] of Object.entries(item.translations ?? {})) {
    if (!text.trim()) continue;
    if (CE_LOCALE_PATTERN.test(locale)) texts[locale] = text.trim();
    else invalidLocales.push(locale);
  }
  if (Object.keys(texts).length === 0) return { texts: null, invalidLocales };
  const name = item.displayName.trim();
  return { texts: name && texts[FALLBACK_LOCALE] === undefined ? { [FALLBACK_LOCALE]: name, ...texts } : texts, invalidLocales };
}

/** The item's `data.item_name`: its lang key when it has translations, else the display name ('' = none). */
export function craftEngineItemName(project: Pick<Project, 'namespace'>, item: Item): string {
  return craftEngineTranslations(item).texts ? `<lang:${craftEngineLangKey(project, item)}>` : item.displayName.trim();
}

/** The lang key CraftEngine turns into the client name of a custom block, e.g. "block_name:ruby:ruby_ore". */
export const craftEngineBlockNameKey = (blockKey: string): string => `block_name:${blockKey}`;

/** The client names of an item's block: its translations, or its display name as `en_us` ({} without a name). */
function blockNames(item: Item): Record<string, string> {
  const { texts } = craftEngineTranslations(item);
  if (texts) return texts;
  const name = item.displayName.trim();
  return name ? { [FALLBACK_LOCALE]: name } : {};
}

/**
 * The `lang:` entries by locale (locale → lang key → text): the items' display names (in item order), the client
 * names of the blocks of `blockItems` (`block_name:<namespace>:<item id>`), then the project's own lang keys, which
 * win over the generated ones. Locales CraftEngine cannot name a lang file after are left out.
 */
export function craftEngineLang(project: Pick<Project, 'namespace' | 'craftEngine'>, items: Item[], blockItems: Item[] = []) {
  const byLocale = new Map<string, Record<string, string>>();
  const put = (locale: string, key: string, text: string) => byLocale.set(locale, { ...byLocale.get(locale), [key]: text });
  for (const item of items) {
    const { texts } = craftEngineTranslations(item);
    for (const [locale, text] of Object.entries(texts ?? {})) put(locale, craftEngineLangKey(project, item), text);
  }
  for (const item of blockItems) {
    const key = craftEngineBlockNameKey(`${project.namespace}:${item.itemId}`);
    for (const [locale, text] of Object.entries(blockNames(item))) put(locale, key, text);
  }
  for (const [locale, texts] of Object.entries(validLocaleSections(projectLang(project)))) {
    for (const [key, text] of Object.entries(texts)) put(locale, key, text);
  }
  return byLocale;
}

/* ====================================================================== Project lang and translations */

/** A locale → key → text map as the project keeps its lang keys and its server translations. */
export type CraftEngineLocaleTexts = Record<string, Record<string, string>>;

/** The project's own client lang keys ({} for a project without any). */
export const projectLang = (project: Pick<Project, 'craftEngine'>): CraftEngineLocaleTexts => project.craftEngine?.lang ?? {};

/** The project's server-side translations ({} for a project without any). */
export const projectServerTranslations = (project: Pick<Project, 'craftEngine'>): CraftEngineLocaleTexts =>
  project.craftEngine?.translations ?? {};

/** The locales of a map CraftEngine cannot read (not like "en", "de_de" or "all"). */
export const invalidLocales = (texts: CraftEngineLocaleTexts): string[] => Object.keys(texts).filter((l) => !CE_LOCALE_PATTERN.test(l));

/** The sections with a readable locale and at least one key, the keys trimmed. */
function validLocaleSections(texts: CraftEngineLocaleTexts): CraftEngineLocaleTexts {
  const result: CraftEngineLocaleTexts = {};
  for (const [locale, entries] of Object.entries(texts)) {
    if (!CE_LOCALE_PATTERN.test(locale)) continue;
    const kept = Object.entries(entries).filter(([key, text]) => key.trim() !== '' && typeof text === 'string');
    if (kept.length > 0) result[locale] = Object.fromEntries(kept.map(([key, text]) => [key.trim(), text]));
  }
  return result;
}

/** The `translations` section: the project's server translations with a readable locale. */
export function craftEngineServerTranslations(project: Pick<Project, 'craftEngine'>): CraftEngineLocaleTexts {
  return validLocaleSections(projectServerTranslations(project));
}

/** The locale `all`: a lang key in it is written into every language. */
const ALL_LOCALES = 'all';

const localeTexts = (localeOptions: typeof CE_LOCALES) =>
  field.map(field.map(field.text({ format: 'minimessage', placeholder: true }), { keyPlaceholder: true, newValue: () => '' }), {
    keyOptions: localeOptions,
    keyPlaceholder: true,
    newValue: () => ({}),
  });

const [langMap, translationMap] = resolveFields(
  {
    lang: localeTexts([{ value: ALL_LOCALES }, ...CE_LOCALES]),
    translations: localeTexts([{ value: 'en' }, { value: 'de' }, ...CE_LOCALES]),
  },
  'craftEngine',
);

/** The project's client lang keys as the editor edits them: locale (or `all`) → lang key → text. */
export const CE_LANG_MAP = langMap as MapField;

/** The project's server translations as the editor edits them: locale → translation key → text. */
export const CE_TRANSLATION_MAP = translationMap as MapField;
