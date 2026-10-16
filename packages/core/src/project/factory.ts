/** Creates new projects, folders and items with sensible defaults. */
import { DEFAULT_MC_VERSION, type ImportedModel } from '@resourcepackbuilder/minecraft';
import { DEFAULT_MATERIAL } from './item';
import { mapMediaLists } from './media/kinds';
import { DEFAULT_PACK_TARGET, type PackTargetId } from './target';
import { slugify, uid } from '@resourcepackbuilder/utils';
import type { Folder, Item, Project, ProjectSettings } from './types';

/** Fallback for pack name and namespace when the project name yields no identifier. */
export const DEFAULT_PACK_NAME = 'resourcepackbuilder';

export function defaultSettings(name: string): ProjectSettings {
  return {
    minecraftVersion: DEFAULT_MC_VERSION,
    useItemModel: true,
    packName: slugify(name, DEFAULT_PACK_NAME),
    packDescription: `${name} – made with ResourcepackBuilder`,
    packIcon: null,
    externalPackAsZip: false,
    itemsInProjectFolder: false,
    yamlFileMode: 'folder',
  };
}

/** The namespace a project named `name` gets unless one is chosen. */
export function defaultNamespace(name: string): string {
  return slugify(name, DEFAULT_PACK_NAME);
}

export function createProject(
  name: string,
  namespace?: string,
  minecraftVersion?: string,
  target: PackTargetId = DEFAULT_PACK_TARGET,
): Project {
  const now = Date.now();
  const settings = defaultSettings(name);
  if (minecraftVersion) settings.minecraftVersion = minecraftVersion;
  return {
    formatVersion: 1,
    id: uid('p_'),
    name,
    target,
    namespace: namespace ?? defaultNamespace(name),
    settings,
    folders: {},
    items: {},
    rootFolderIds: [],
    ...mapMediaLists(() => []),
    createdAt: now,
    updatedAt: now,
  };
}

export function createFolder(name: string, parentId: string | null): Folder {
  return { id: uid('f_'), name, parentId, folderIds: [], itemIds: [] };
}

export interface NewItemInput {
  displayName: string;
  itemId: string;
  folderId: string;
  material?: string;
  model: ImportedModel | null;
}

export function createItem(input: NewItemInput): Item {
  const now = Date.now();
  return {
    id: uid('i_'),
    itemId: input.itemId,
    displayName: input.displayName,
    folderId: input.folderId,
    model: input.model,
    config: { material: input.material ?? DEFAULT_MATERIAL },
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

/** File name of the project's own Nexo files (glyphs/<name>.yml, recipes/<type>/<name>.yml, items/<name>/). */
export function projectFileName(project: Pick<Project, 'name'>): string {
  return slugify(project.name, DEFAULT_PACK_NAME);
}
