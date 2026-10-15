/** Creates new projects, folders and items with sensible defaults. */
import type { Folder, ImportedModel, Item, Project, ProjectSettings } from '../types';
import { DEFAULT_MC_VERSION } from '../minecraft/versions';
import { slugify, uid } from '../util';

export function defaultSettings(name: string): ProjectSettings {
  return {
    minecraftVersion: DEFAULT_MC_VERSION,
    useItemModel: true,
    packName: slugify(name, 'resourcepackbuilder'),
    packDescription: `${name} – erstellt mit ResourcepackBuilder`,
    packIcon: null,
    externalPackAsZip: false,
    itemsInProjectFolder: false,
    yamlFileMode: 'folder',
  };
}

export function createProject(name: string, namespace?: string, minecraftVersion?: string): Project {
  const now = Date.now();
  const settings = defaultSettings(name);
  if (minecraftVersion) settings.minecraftVersion = minecraftVersion;
  return {
    formatVersion: 1,
    id: uid('p_'),
    name,
    namespace: namespace ?? slugify(name, 'resourcepackbuilder'),
    settings,
    folders: {},
    items: {},
    rootFolderIds: [],
    glyphs: [],
    sounds: [],
    paintings: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createFolder(name: string, parentId: string | null): Folder {
  return { id: uid('f_'), name, parentId, folderIds: [], itemIds: [] };
}

export interface NewItemInput {
  displayName: string;
  nexoId: string;
  folderId: string;
  material?: string;
  model: ImportedModel | null;
}

export function createItem(input: NewItemInput): Item {
  const now = Date.now();
  return {
    id: uid('i_'),
    nexoId: input.nexoId,
    displayName: input.displayName,
    folderId: input.folderId,
    model: input.model,
    config: { material: input.material ?? 'PAPER' },
    rawYaml: '',
    assets: {},
    recipes: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Inserts a folder/item into a project (mutates the project – for Immer drafts or tests). */
export function insertFolder(project: Project, folder: Folder): void {
  project.folders[folder.id] = folder;
  if (folder.parentId) project.folders[folder.parentId]?.folderIds.push(folder.id);
  else project.rootFolderIds.push(folder.id);
}

export function insertItem(project: Project, item: Item): void {
  project.items[item.id] = item;
  project.folders[item.folderId]?.itemIds.push(item.id);
}

/** Suggests a unique item ID, e.g. "ruby_sword_2" if "ruby_sword" already exists. */
export function uniqueNexoId(project: Project, wanted: string, ignoreItemId?: string): string {
  const base = slugify(wanted, 'item');
  const taken = new Set(
    Object.values(project.items)
      .filter((i) => i.id !== ignoreItemId)
      .map((i) => i.nexoId),
  );
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}
