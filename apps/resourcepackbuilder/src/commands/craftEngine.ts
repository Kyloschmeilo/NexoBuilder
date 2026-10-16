/** The project-wide CraftEngine data (`project.craftEngine`): loot sources, templates, global variables and attributes. */
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
