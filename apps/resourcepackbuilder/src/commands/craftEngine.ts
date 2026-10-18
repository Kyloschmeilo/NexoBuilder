/**
 * The project-wide CraftEngine data (`project.craftEngine`): loot sources, templates, global variables, attributes,
 * lang keys, translations, categories and the other project sections.
 */
import {
  type ConfigObject,
  type CraftEngineAttributeData,
  type CraftEngineProjectData,
  toConfigValue,
} from '@resourcepackbuilder/core/project';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { mutate } from '../store/project';

/** Sets one part of the CraftEngine data; an empty part is removed, and with it an empty `craftEngine`. */
function setCraftEngineData<K extends keyof CraftEngineProjectData>(key: K, value: CraftEngineProjectData[K] | undefined): void {
  mutate((draft) => {
    const data: CraftEngineProjectData = { ...draft.craftEngine };
    if (value !== undefined) data[key] = value;
    else delete data[key];
    if (Object.keys(data).length > 0) draft.craftEngine = data;
    else delete draft.craftEngine;
  }, key);
}

/** The entries of a list value that are objects. */
function objectList(value: unknown): ConfigObject[] {
  const config = toConfigValue(value);
  return Array.isArray(config) ? config.filter((entry): entry is ConfigObject => isPlainObject(entry)) : [];
}

/** Replaces the loot sources; without any, the key is removed. */
export function setLootSources(value: unknown): void {
  const sources = objectList(value);
  setCraftEngineData('lootSources', sources.length > 0 ? sources : undefined);
}

/** Replaces the templates; without any, the key is removed. */
export function setTemplates(value: unknown): void {
  const templates = objectList(value);
  setCraftEngineData('templates', templates.length > 0 ? templates : undefined);
}

/** Replaces the global variables (name → text; other values are dropped); without any, the key is removed. */
export function setGlobalVariables(value: unknown): void {
  const entries = isPlainObject(value)
    ? Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    : [];
  setCraftEngineData('globalVariables', entries.length > 0 ? Object.fromEntries(entries) : undefined);
}

/** Replaces one list of the attribute system; an empty list is removed, and with the last one `attributes`. */
export function setAttributeEntries(part: keyof CraftEngineAttributeData, value: unknown): void {
  const entries = objectList(value);
  mutate((draft) => {
    const attributes: CraftEngineAttributeData = { ...draft.craftEngine?.attributes };
    if (entries.length > 0) attributes[part] = entries;
    else delete attributes[part];
    const data: CraftEngineProjectData = { ...draft.craftEngine };
    if (Object.keys(attributes).length > 0) data.attributes = attributes;
    else delete data.attributes;
    if (Object.keys(data).length > 0) draft.craftEngine = data;
    else delete draft.craftEngine;
  }, `attributes.${part}`);
}

/** A locale → key → text map from an edited value: other values are dropped (a locale without keys stays, to be filled). */
function localeTexts(value: unknown): Record<string, Record<string, string>> | undefined {
  if (!isPlainObject(value)) return undefined;
  const result: Record<string, Record<string, string>> = {};
  for (const [locale, texts] of Object.entries(value)) {
    if (!isPlainObject(texts)) continue;
    const entries = Object.entries(texts).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
    result[locale] = Object.fromEntries(entries);
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/** Replaces the project's own client lang keys (locale → key → text); without any, the key is removed. */
export function setLang(value: unknown): void {
  setCraftEngineData('lang', localeTexts(value));
}

/** Replaces the server-side translations (locale → key → text); without any, the key is removed. */
export function setServerTranslations(value: unknown): void {
  setCraftEngineData('translations', localeTexts(value));
}

/** The parts of the CraftEngine data that are plain lists of entries */
export type CraftEngineListKey = 'categories' | 'configuredFeatures' | 'placedFeatures' | 'atlases';

/** Replaces one list of entries (categories, worldgen features, atlases); without any, the key is removed. */
export function setCraftEngineList(key: CraftEngineListKey, value: unknown): void {
  const entries = objectList(value);
  setCraftEngineData(key, entries.length > 0 ? entries : undefined);
}
