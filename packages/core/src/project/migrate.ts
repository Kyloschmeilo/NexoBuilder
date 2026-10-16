/**
 * Brings stored projects (IndexedDB, project files, shared folders) of any earlier version into
 * the current shape. Stored data is untrusted: every field is checked and missing ones get defaults.
 *
 * Migrations:
 *  - armor settings moved from `item.config.$armor` to `item.armor`
 *  - issues stored with imported models: `params` became `args`
 * Afterwards the folder tree is repaired (see repair.ts), e.g. items without a folder are rescued.
 */
import { CoreError, type Issue, type IssueLevel, type MessageArgs } from '../issues';
import type { ImportedModel, JavaModelJson, ModelSource } from '../model/types';
import { toArmorSettings, type ArmorSettings } from '../nexo/armor';
import { MEDIA_KINDS, mapMediaLists } from '../nexo/media/kinds';
import { isPlainObject } from '../object';
import { defaultSettings, DEFAULT_PACK_NAME } from './factory';
import { uid } from '../id';
import { repairProject } from './repair';
import type { ConfigObject, Folder, Item, Project, ProjectSettings } from './types';

/** Former location of the armor settings inside the item configuration */
const LEGACY_ARMOR_KEY = '$armor';

const string = (value: unknown, fallback: string): string => (typeof value === 'string' ? value : fallback);
const number = (value: unknown, fallback: number): number => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const boolean = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);
const list = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

export function migrateProject(raw: unknown, now = Date.now()): Project {
  if (!isPlainObject(raw)) throw new CoreError('project.invalid');
  if (typeof raw.name !== 'string') throw new CoreError('project.noName');
  const items: Record<string, Item> = {};
  if (isPlainObject(raw.items)) {
    for (const [id, value] of Object.entries(raw.items)) {
      const item = migrateItem(value, now, id);
      if (item) items[id] = item;
    }
  }
  const folders: Record<string, Folder> = {};
  if (isPlainObject(raw.folders)) {
    for (const [id, value] of Object.entries(raw.folders)) {
      const folder = migrateFolder(value, id);
      if (folder) folders[id] = folder;
    }
  }
  const project: Project = {
    formatVersion: 1,
    id: string(raw.id, uid('p_')),
    name: raw.name,
    namespace: string(raw.namespace, DEFAULT_PACK_NAME),
    settings: migrateSettings(raw.settings, raw.name),
    folders,
    items,
    rootFolderIds: strings(raw.rootFolderIds),
    ...mapMediaLists((kind) => list(raw[MEDIA_KINDS[kind].list])),
    createdAt: number(raw.createdAt, now),
    updatedAt: number(raw.updatedAt, now),
  };
  repairProject(project);
  return project;
}

function migrateSettings(raw: unknown, projectName: string): ProjectSettings {
  const defaults = defaultSettings(projectName);
  if (!isPlainObject(raw)) return defaults;
  return {
    minecraftVersion: string(raw.minecraftVersion, defaults.minecraftVersion),
    useItemModel: boolean(raw.useItemModel, defaults.useItemModel),
    packName: string(raw.packName, defaults.packName),
    packDescription: string(raw.packDescription, defaults.packDescription),
    packIcon: typeof raw.packIcon === 'string' ? raw.packIcon : null,
    externalPackAsZip: boolean(raw.externalPackAsZip, defaults.externalPackAsZip),
    itemsInProjectFolder: boolean(raw.itemsInProjectFolder, defaults.itemsInProjectFolder),
    yamlFileMode: raw.yamlFileMode === 'item' ? 'item' : 'folder',
  };
}

function migrateFolder(raw: unknown, id: string): Folder | null {
  if (!isPlainObject(raw)) return null;
  return {
    id,
    name: string(raw.name, ''),
    parentId: typeof raw.parentId === 'string' ? raw.parentId : null,
    folderIds: strings(raw.folderIds),
    itemIds: strings(raw.itemIds),
  };
}

/** Migrates one stored item (also used for items received from a shared folder). */
export function migrateItem(raw: unknown, now = Date.now(), fallbackId?: string): Item | null {
  const id = isPlainObject(raw) ? string(raw.id, fallbackId ?? '') : '';
  if (!isPlainObject(raw) || !id) return null;
  const config: ConfigObject = isPlainObject(raw.config) ? { ...(raw.config as ConfigObject) } : {};
  const legacyArmor = config[LEGACY_ARMOR_KEY];
  delete config[LEGACY_ARMOR_KEY];
  const armor = migrateArmor(raw.armor) ?? migrateArmor(legacyArmor);
  const item: Item = {
    id,
    nexoId: string(raw.nexoId, ''),
    displayName: string(raw.displayName, ''),
    folderId: string(raw.folderId, ''),
    model: migrateModel(raw.model),
    config,
    rawYaml: string(raw.rawYaml, ''),
    assets: isPlainObject(raw.assets) ? (raw.assets as Item['assets']) : {},
    recipes: list(raw.recipes),
    createdAt: number(raw.createdAt, now),
    updatedAt: number(raw.updatedAt, now),
  };
  if (isPlainObject(raw.variants)) {
    const variants: Record<string, ImportedModel[]> = {};
    for (const [slot, models] of Object.entries(raw.variants)) {
      variants[slot] = list(models)
        .map(migrateModel)
        .filter((m): m is ImportedModel => m !== null);
    }
    item.variants = variants;
  }
  if (armor) item.armor = armor;
  return item;
}

function migrateArmor(raw: unknown): ArmorSettings | undefined {
  return isPlainObject(raw) ? toArmorSettings(raw) : undefined;
}

function migrateModel(raw: unknown): ImportedModel | null {
  if (!isPlainObject(raw)) return null;
  const model: ImportedModel = {
    source: raw.source === 'bbmodel' || raw.source === 'png' ? (raw.source satisfies ModelSource) : 'json',
    fileName: string(raw.fileName, ''),
    json: isPlainObject(raw.json) ? (raw.json as JavaModelJson) : {},
    textures: list(raw.textures),
    issues: list(raw.issues)
      .map(migrateIssue)
      .filter((i): i is Issue => i !== null),
  };
  if (typeof raw.requiresVersion === 'string') model.requiresVersion = raw.requiresVersion;
  return model;
}

const LEVELS: IssueLevel[] = ['error', 'warning', 'info'];

function migrateIssue(raw: unknown): Issue | null {
  if (!isPlainObject(raw) || typeof raw.code !== 'string') return null;
  const level = LEVELS.find((l) => l === raw.level) ?? 'info';
  const args = isPlainObject(raw.args) ? raw.args : isPlainObject(raw.params) ? raw.params : null;
  return args ? { level, code: raw.code, args: args as MessageArgs } : { level, code: raw.code };
}
