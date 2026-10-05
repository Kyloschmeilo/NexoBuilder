/** Projekt-Aktionen (Ordner und Items anlegen, verschieben, löschen …). */
import type { ConfigObject, ConfigValue, Item, Project } from '../core/types';
import { createFolder, createItem, insertFolder, insertItem, uniqueNexoId, type NewItemInput } from '../core/project/factory';
import { getDescendantFolderIds } from '../core/project/tree';
import { deletePath, setPath } from '../core/nexo/configPath';
import { PROPERTY_BY_ID } from '../core/nexo/schema';
import { deepClone, slugify, uid } from '../core/util';
import { createGlyph, type Glyph, type GlyphFile, type GlyphKind } from '../core/nexo/glyphs';
import { useStore } from './store';

const mutate = (recipe: (draft: Project) => void, key?: string) => useStore.getState().mutate(recipe, key);

export function addFolder(name: string, parentId: string | null): string {
  const folder = createFolder(name.trim() || 'Neuer Ordner', parentId);
  mutate((draft) => insertFolder(draft, folder));
  const state = useStore.getState();
  state.setExpanded(folder.id, true);
  if (parentId) state.setExpanded(parentId, true);
  state.select({ kind: 'folder', id: folder.id });
  return folder.id;
}

export function renameFolder(folderId: string, name: string) {
  mutate((draft) => {
    const folder = draft.folders[folderId];
    if (folder) folder.name = name.trim() || folder.name;
  });
}

export function deleteFolder(folderId: string) {
  const project = useStore.getState().project;
  if (!project) return;
  const ids = getDescendantFolderIds(project, folderId);
  mutate((draft) => {
    for (const id of ids) {
      for (const itemId of draft.folders[id]?.itemIds ?? []) delete draft.items[itemId];
    }
    const folder = draft.folders[folderId];
    if (folder?.parentId) {
      const parent = draft.folders[folder.parentId];
      if (parent) parent.folderIds = parent.folderIds.filter((id) => id !== folderId);
    } else {
      draft.rootFolderIds = draft.rootFolderIds.filter((id) => id !== folderId);
    }
    for (const id of ids) delete draft.folders[id];
  });
  const { selection } = useStore.getState();
  const gone =
    selection?.kind === 'folder'
      ? ids.includes(selection.id)
      : selection?.kind === 'item'
        ? !useStore.getState().project?.items[selection.id]
        : false;
  if (gone) useStore.getState().select(null);
}

/** Verschiebt einen Ordner in einen anderen Ordner (oder in die oberste Ebene). */
export function moveFolder(folderId: string, newParentId: string | null, beforeFolderId?: string) {
  const project = useStore.getState().project;
  if (!project) return;
  if (newParentId && getDescendantFolderIds(project, folderId).includes(newParentId)) return;
  mutate((draft) => {
    const folder = draft.folders[folderId];
    if (!folder) return;
    if (folder.parentId) {
      const parent = draft.folders[folder.parentId];
      if (parent) parent.folderIds = parent.folderIds.filter((id) => id !== folderId);
    } else {
      draft.rootFolderIds = draft.rootFolderIds.filter((id) => id !== folderId);
    }
    folder.parentId = newParentId;
    const list = newParentId ? draft.folders[newParentId].folderIds : draft.rootFolderIds;
    const index = beforeFolderId ? list.indexOf(beforeFolderId) : -1;
    if (index >= 0) list.splice(index, 0, folderId);
    else list.push(folderId);
  });
}

export function addItem(input: NewItemInput): string {
  const item = createItem(input);
  mutate((draft) => {
    item.nexoId = uniqueNexoId(draft, item.nexoId);
    insertItem(draft, item);
  });
  const state = useStore.getState();
  state.setExpanded(input.folderId, true);
  state.select({ kind: 'item', id: item.id });
  return item.id;
}

export function updateItem(itemId: string, recipe: (item: Item) => void, historyKey?: string) {
  mutate((draft) => {
    const item = draft.items[itemId];
    if (!item) return;
    recipe(item);
    item.updatedAt = Date.now();
  }, historyKey ? `${itemId}:${historyKey}` : undefined);
}

export function setItemConfigValue(itemId: string, path: string[], value: ConfigValue | undefined, historyKey?: string) {
  updateItem(
    itemId,
    (item) => {
      if (value === undefined) deletePath(item.config, path);
      else setPath(item.config, path, value);
    },
    historyKey ?? path.join('.'),
  );
}

export function addProperty(itemId: string, propertyId: string) {
  const def = PROPERTY_BY_ID.get(propertyId);
  if (!def) return;
  updateItem(itemId, (item) => setPath(item.config as ConfigObject, def.path, def.defaultValue()));
}

export function removeProperty(itemId: string, propertyId: string) {
  const def = PROPERTY_BY_ID.get(propertyId);
  if (!def) return;
  updateItem(itemId, (item) => {
    deletePath(item.config, def.path);
    // Nicht mehr referenzierte Zusatz-Texturen entfernen
    const used = JSON.stringify(item.config);
    for (const assetId of Object.keys(item.assets ?? {})) {
      if (!used.includes(`@asset:${assetId}`)) delete item.assets[assetId];
    }
  });
}

export function deleteItem(itemId: string) {
  mutate((draft) => {
    const item = draft.items[itemId];
    if (!item) return;
    const folder = draft.folders[item.folderId];
    if (folder) folder.itemIds = folder.itemIds.filter((id) => id !== itemId);
    delete draft.items[itemId];
  });
  const { selection } = useStore.getState();
  if (selection?.kind === 'item' && selection.id === itemId) useStore.getState().select(null);
}

export function moveItem(itemId: string, folderId: string, beforeItemId?: string) {
  mutate((draft) => {
    const item = draft.items[itemId];
    const target = draft.folders[folderId];
    if (!item || !target) return;
    const source = draft.folders[item.folderId];
    if (source) source.itemIds = source.itemIds.filter((id) => id !== itemId);
    item.folderId = folderId;
    const index = beforeItemId ? target.itemIds.indexOf(beforeItemId) : -1;
    if (index >= 0) target.itemIds.splice(index, 0, itemId);
    else target.itemIds.push(itemId);
  });
  useStore.getState().setExpanded(folderId, true);
}

export function duplicateItem(itemId: string): string | null {
  const project = useStore.getState().project;
  const original = project?.items[itemId];
  if (!project || !original) return null;
  const copy: Item = deepClone(original);
  copy.id = uid('i_');
  copy.recipes = (copy.recipes ?? []).map((r) => ({ ...r, id: uid('r_') }));
  copy.displayName = original.displayName ? `${original.displayName} (Kopie)` : '';
  copy.createdAt = Date.now();
  copy.updatedAt = Date.now();
  mutate((draft) => {
    copy.nexoId = uniqueNexoId(draft, `${original.nexoId}_kopie`);
    draft.items[copy.id] = copy;
    const folder = draft.folders[copy.folderId];
    if (folder) {
      const index = folder.itemIds.indexOf(itemId);
      folder.itemIds.splice(index + 1, 0, copy.id);
    }
  });
  useStore.getState().select({ kind: 'item', id: copy.id });
  return copy.id;
}

export function updateProjectSettings(recipe: (project: Project) => void) {
  mutate(recipe, 'settings');
}

/* ------------------------------------------------------------------ Glyphen */

function uniqueGlyphId(project: Project, wanted: string): string {
  const base = slugify(wanted, 'glyph');
  const taken = new Set((project.glyphs ?? []).map((g) => g.glyphId));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

export function addGlyph(name: string, file: GlyphFile | null, kind: GlyphKind): string {
  const id = uid('g_');
  mutate((draft) => {
    draft.glyphs = draft.glyphs ?? [];
    draft.glyphs.push(createGlyph(id, uniqueGlyphId(draft, name), file, kind));
  });
  return id;
}

export function updateGlyph(glyphId: string, recipe: (glyph: Glyph) => void, historyKey?: string) {
  mutate((draft) => {
    const glyph = draft.glyphs?.find((g) => g.id === glyphId);
    if (glyph) recipe(glyph);
  }, historyKey ? `glyph:${glyphId}:${historyKey}` : undefined);
}

export function deleteGlyph(glyphId: string) {
  mutate((draft) => {
    draft.glyphs = (draft.glyphs ?? []).filter((g) => g.id !== glyphId);
  });
}
