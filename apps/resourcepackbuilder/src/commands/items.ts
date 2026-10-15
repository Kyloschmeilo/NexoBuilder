/** Creating, changing, moving and deleting items. */
import { produce } from 'immer';
import type { ConfigValue, Item, Project } from '@resourcepackbuilder/core/project/types';
import { createItem, insertItem, type NewItemInput } from '@resourcepackbuilder/core/project/factory';
import { uid, uniqueNexoId } from '@resourcepackbuilder/core/project/ids';
import { pruneUnusedAssets } from '@resourcepackbuilder/core/project/assets';
import { deepClone } from '@resourcepackbuilder/core/object';
import { PROPERTY_BY_ID, type PropertyDef } from '@resourcepackbuilder/core/nexo/schema';
import { setPropertyValue } from '@resourcepackbuilder/core/nexo/properties';
import { getProject, mutate } from '../store/project';
import { select, setExpanded } from '../store/ui';

/** Adds the item to the draft with a unique item id (for commands that create items). */
export function insertNewItem(draft: Project, input: NewItemInput, configure?: (item: Item) => void): Item {
  const item = createItem(input);
  item.nexoId = uniqueNexoId(draft, item.nexoId);
  configure?.(item);
  insertItem(draft, item);
  return item;
}

/** Creates items (one undo step) and selects the last one. */
export function addItems(inputs: NewItemInput[]): void {
  const created: Item[] = [];
  mutate((draft) => {
    for (const input of inputs) created.push(insertNewItem(draft, input));
  });
  const last = created.at(-1);
  if (last) showItem(last.folderId, last.id);
}

/** Expands the item's folder and selects the item. */
export function showItem(folderId: string, itemId: string): void {
  setExpanded(folderId, true);
  select({ kind: 'item', id: itemId });
}

/**
 * Changes an item. Nothing happens (no undo step) when the recipe changes nothing; otherwise the item's
 * `updatedAt` is stamped. Equal `historyKey`s in quick succession form one undo step.
 */
export function updateItem(itemId: string, recipe: (item: Item) => void, historyKey?: string): void {
  const item = getProject()?.items[itemId];
  if (!item) return;
  const next = produce(item, recipe);
  if (next === item) return;
  mutate(
    (draft) => {
      draft.items[itemId] = { ...next, updatedAt: Date.now() };
    },
    historyKey === undefined ? undefined : `${itemId}:${historyKey}`,
  );
}

/** Sets a property value of an item; `undefined` removes it. */
export function setItemProperty(itemId: string, def: PropertyDef, value: ConfigValue | undefined, historyKey = def.id): void {
  updateItem(itemId, (item) => setPropertyValue(item, def, value), historyKey);
}

export function addProperty(itemId: string, propertyId: string): void {
  const def = PROPERTY_BY_ID.get(propertyId);
  if (def) updateItem(itemId, (item) => setPropertyValue(item, def, def.defaultValue()));
}

/** Removes a property and the extra textures only it used. */
export function removeProperty(itemId: string, propertyId: string): void {
  const def = PROPERTY_BY_ID.get(propertyId);
  if (!def) return;
  updateItem(itemId, (item) => {
    setPropertyValue(item, def, undefined);
    pruneUnusedAssets(item);
  });
}

export function deleteItem(itemId: string): void {
  mutate((draft) => {
    const item = draft.items[itemId];
    if (!item) return;
    const folder = draft.folders[item.folderId];
    if (folder) folder.itemIds = folder.itemIds.filter((id) => id !== itemId);
    delete draft.items[itemId];
  });
}

/** Moves an item into a folder, optionally before another item. */
export function moveItem(itemId: string, folderId: string, beforeItemId?: string): void {
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
  setExpanded(folderId, true);
}

/** Copies an item next to the original and selects the copy; `displayName` is the copy's name. */
export function duplicateItem(itemId: string, displayName: string): string | null {
  const original = getProject()?.items[itemId];
  if (!original) return null;
  const now = Date.now();
  const copy: Item = {
    ...deepClone(original),
    id: uid('i_'),
    displayName,
    recipes: original.recipes.map((r) => ({ ...deepClone(r), id: uid('r_') })),
    createdAt: now,
    updatedAt: now,
  };
  mutate((draft) => {
    copy.nexoId = uniqueNexoId(draft, `${original.nexoId}_copy`);
    draft.items[copy.id] = copy;
    const folder = draft.folders[copy.folderId];
    if (folder) folder.itemIds.splice(folder.itemIds.indexOf(itemId) + 1, 0, copy.id);
  });
  select({ kind: 'item', id: copy.id });
  return copy.id;
}
