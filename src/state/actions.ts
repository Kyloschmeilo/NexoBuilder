/** Projekt-Aktionen (Ordner und Items anlegen, verschieben, löschen …). */
import type { ConfigObject, ConfigValue, Item, Project } from '../core/types';
import { createFolder, createItem, insertFolder, insertItem, uniqueNexoId, type NewItemInput } from '../core/project/factory';
import { getDescendantFolderIds } from '../core/project/tree';
import { deletePath, setPath } from '../core/nexo/configPath';
import { PROPERTY_BY_ID } from '../core/nexo/schema';
import { deepClone, slugify, uid } from '../core/util';
import { createGlyph, type Glyph, type GlyphFile, type GlyphKind } from '../core/nexo/glyphs';
import { createSound, type Sound, type SoundFile } from '../core/nexo/sounds';
import { createPainting, type Painting, type PaintingFile } from '../core/nexo/paintings';
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

/* ------------------------------------------------------------------ Sounds */

function uniqueListId(taken: Set<string>, wanted: string, pattern: RegExp, fallback: string): string {
  const base = wanted.toLowerCase().replace(pattern, '_').replace(/^_+|_+$/g, '') || fallback;
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

export function addSound(name: string, files: SoundFile[]): string {
  const id = uid('s_');
  mutate((draft) => {
    draft.sounds = draft.sounds ?? [];
    const soundId = uniqueListId(new Set(draft.sounds.map((s) => s.soundId)), name, /[^a-z0-9_.-]+/g, 'sound');
    draft.sounds.push(createSound(id, soundId, files));
  });
  return id;
}

export function updateSound(soundId: string, recipe: (sound: Sound) => void, historyKey?: string) {
  mutate((draft) => {
    const sound = draft.sounds?.find((s) => s.id === soundId);
    if (sound) recipe(sound);
  }, historyKey ? `sound:${soundId}:${historyKey}` : undefined);
}

export function deleteSound(soundId: string) {
  mutate((draft) => {
    draft.sounds = (draft.sounds ?? []).filter((s) => s.id !== soundId);
  });
}

/* ------------------------------------------------------------------ Gemälde */

export function addPainting(name: string, file: PaintingFile | null): string {
  const id = uid('p_');
  mutate((draft) => {
    draft.paintings = draft.paintings ?? [];
    const paintingId = uniqueListId(new Set(draft.paintings.map((p) => p.paintingId)), slugify(name, 'gemaelde'), /[^a-z0-9_]+/g, 'gemaelde');
    draft.paintings.push(createPainting(id, paintingId, file));
  });
  return id;
}

export function updatePainting(paintingId: string, recipe: (painting: Painting) => void, historyKey?: string) {
  mutate((draft) => {
    const painting = draft.paintings?.find((p) => p.id === paintingId);
    if (painting) recipe(painting);
  }, historyKey ? `painting:${paintingId}:${historyKey}` : undefined);
}

export function deletePainting(paintingId: string) {
  mutate((draft) => {
    draft.paintings = (draft.paintings ?? []).filter((p) => p.id !== paintingId);
  });
}

/** Legt ein Item an, das dieses Gemälde aufhängt (Material PAINTING + painting_variant). */
export function addPaintingItem(painting: Painting): string | null {
  const project = useStore.getState().project;
  if (!project) return null;
  let folderId = project.rootFolderIds[0];
  if (!folderId) folderId = addFolder('Gemälde', null);
  const itemId = addItem({ displayName: painting.title || painting.paintingId, nexoId: painting.paintingId, folderId, material: 'PAINTING', model: null });
  updateItem(itemId, (item) => {
    item.config.Components = { painting_variant: `${project.namespace}:${painting.paintingId}` };
  });
  return itemId;
}

/** Legt ein Item an, das diesen Sound als Musik-CD in der Jukebox abspielt. */
export function addMusicDiscItem(sound: Sound): string | null {
  const project = useStore.getState().project;
  if (!project) return null;
  let folderId = project.rootFolderIds[0];
  if (!folderId) folderId = addFolder('Musik', null);
  const nexoId = `${sound.soundId.replace(/[^a-z0-9_]+/g, '_')}_disc`;
  const itemId = addItem({ displayName: sound.jukebox?.description || sound.soundId, nexoId, folderId, material: 'PAPER', model: null });
  updateItem(itemId, (item) => {
    item.config.Components = { max_stack_size: 1, jukebox_playable: { song_key: `${project.namespace}:${sound.soundId}` } };
  });
  return itemId;
}
