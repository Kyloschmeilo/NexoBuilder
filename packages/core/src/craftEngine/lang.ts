/**
 * Display name translations of CraftEngine items (`item.translations`). An item with translations gets
 * `data.item_name: <lang:item.<namespace>.<item id>>`, and the export writes its names into the pack's lang files
 * (`lang:` sections, which CraftEngine puts into the resource pack's assets/minecraft/lang/<locale>.json). The
 * display name is the `en_us` text unless a translation sets it, so a client in any other language falls back to it.
 */
import type { Item, Project } from '../project/types';

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

/** The `lang:` entries of the items by locale (locale → lang key → text), in item order. */
export function craftEngineLang(project: Pick<Project, 'namespace'>, items: Item[]): Map<string, Record<string, string>> {
  const byLocale = new Map<string, Record<string, string>>();
  for (const item of items) {
    const { texts } = craftEngineTranslations(item);
    for (const [locale, text] of Object.entries(texts ?? {})) {
      byLocale.set(locale, { ...byLocale.get(locale), [craftEngineLangKey(project, item)]: text });
    }
  }
  return byLocale;
}
