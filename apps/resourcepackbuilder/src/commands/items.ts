/** Creating, changing, moving and deleting items. */
import { current, isDraft, produce } from 'immer';
import {
  type ConfigObject,
  type ConfigValue,
  createRecipe,
  furnitureStatePath,
  type Item,
  type NewItemInput,
  pruneUnusedAssets,
  type Recipe,
  type RecipeType,
  setPath,
  type VariantSlot,
} from '@resourcepackbuilder/core/project';
import {
  createTexture,
  type ImportedModel,
  type ModelTexture,
  type TextureAnimationSettings,
  withTextureAnimation,
} from '@resourcepackbuilder/minecraft';
import * as operations from '@resourcepackbuilder/core/project';
import { assetToken, isPlainObject, texturePlaceholder, uid } from '@resourcepackbuilder/utils';
import { propertyById, type PropertyDef, setPropertyValue } from '@resourcepackbuilder/core/form';
import { formFor } from '@resourcepackbuilder/core/targets';
import { applyBlockBehavior, CE_DEFAULT_AUTO_STATE, craftEngineItemKey, newCraftEngineBlock } from '@resourcepackbuilder/core/craftEngine';
import { getProject, mutate } from '../store/project';
import { select, setExpanded } from '../store/ui';

/** Creates items (one undo step) and selects the last one. */
export function addItems(inputs: NewItemInput[]): void {
  const created: Item[] = [];
  mutate((draft) => {
    for (const input of inputs) created.push(operations.insertNewItem(draft, input));
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

/** A property of the open project's form. */
function projectProperty(propertyId: string): PropertyDef | undefined {
  const project = getProject();
  return project ? propertyById(formFor(project.target), propertyId) : undefined;
}

export function addProperty(itemId: string, propertyId: string): void {
  const def = projectProperty(propertyId);
  if (def) updateItem(itemId, (item) => setPropertyValue(item, def, def.defaultValue()));
}

/** Removes a property and the extra textures only it used. */
export function removeProperty(itemId: string, propertyId: string): void {
  const def = projectProperty(propertyId);
  if (!def) return;
  updateItem(itemId, (item) => {
    setPropertyValue(item, def, undefined);
    pruneUnusedAssets(item);
  });
}

/** Stores a PNG as an extra texture of the item (e.g. an armor layer) and returns its asset token. */
export function addItemAsset(itemId: string, fileName: string, dataUrl: string): string {
  const id = uid('a');
  updateItem(itemId, (item) => {
    item.assets[id] = createTexture(id, fileName, dataUrl);
  });
  return assetToken(id);
}

// --- Model -------------------------------------------------------------------------------------------

export function setItemModel(itemId: string, model: ImportedModel | null): void {
  updateItem(itemId, (item) => {
    item.model = model;
  });
}

/** Changes the item's model (nothing happens without one). */
export function updateItemModel(itemId: string, recipe: (model: ImportedModel) => void, historyKey?: string): void {
  updateItem(
    itemId,
    (item) => {
      if (item.model) recipe(item.model);
    },
    historyKey,
  );
}

/** Changes one texture of the item's model. */
export function updateModelTexture(itemId: string, textureId: string, recipe: (texture: ModelTexture) => void, historyKey?: string): void {
  updateItemModel(
    itemId,
    (model) => {
      const texture = model.textures.find((candidate) => candidate.id === textureId);
      if (texture) recipe(texture);
    },
    historyKey,
  );
}

/** Sets the animation of a texture, keeping the other values of its .mcmeta animation (frames, size). */
export function setTextureAnimation(
  itemId: string,
  textureId: string,
  animation: TextureAnimationSettings | null,
  historyKey?: string,
): void {
  updateModelTexture(
    itemId,
    textureId,
    (texture) => {
      texture.mcmeta = withTextureAnimation(texture.mcmeta, animation);
    },
    historyKey,
  );
}

/**
 * Replaces a texture reference of the model (e.g. a vanilla texture "minecraft:item/stick") by a new
 * texture of the model: every key that used the reference now uses the texture.
 */
export function assignTextureReference(itemId: string, reference: string, fileName: string, dataUrl: string): void {
  updateItemModel(itemId, (model) => {
    const references = model.json.textures;
    if (!references) return;
    const texture = createTexture(uid('t'), fileName, dataUrl);
    model.textures.push(texture);
    for (const [key, value] of Object.entries(references)) {
      if (value === reference) references[key] = texturePlaceholder(texture.id);
    }
  });
}

// --- Variants and furniture --------------------------------------------------------------------------

/** Sets the models of a variant slot; an empty list keeps the variant (added, but without a model yet). */
export function setVariantModels(itemId: string, slot: VariantSlot, models: ImportedModel[]): void {
  updateItem(itemId, (item) => {
    item.variants = { ...item.variants, [slot]: models };
  });
}

export function removeVariant(itemId: string, slot: VariantSlot): void {
  updateItem(itemId, (item) => {
    if (item.variants) delete item.variants[slot];
  });
}

/** Adds an empty state to the item's furniture mechanic (Mechanics.furniture.states.<name>). */
export function addFurnitureState(itemId: string, name: string): void {
  updateItem(itemId, (item) => setPath(item.config, furnitureStatePath(name), {}));
}

// --- CraftEngine blocks ------------------------------------------------------------------------------

/** Turns the item into a CraftEngine block (a new block definition) or back into a plain item. */
export function setCraftEngineBlock(itemId: string, isBlock: boolean): void {
  updateItem(itemId, (item) => {
    if (isBlock) item.config.block = newCraftEngineBlock();
    else delete item.config.block;
  });
}

/**
 * Replaces the item's block with what `next` makes of it (the block editors build it with core's block helpers);
 * equal `historyKey`s in quick succession form one undo step.
 */
export function updateCraftEngineBlock(itemId: string, next: (block: ConfigObject) => ConfigObject, historyKey?: string): void {
  updateItem(
    itemId,
    (item) => {
      const block = item.config.block;
      if (!isPlainObject(block)) return;
      item.config.block = next(isDraft(block) ? current(block) : block);
    },
    historyKey,
  );
}

/** Gives the item's block the behavior of a form with the states it needs, or none (`null`). */
export function setBlockBehavior(itemId: string, type: string | null): void {
  const project = getProject();
  const item = project?.items[itemId];
  if (!project || !item) return;
  updateCraftEngineBlock(itemId, (block) =>
    applyBlockBehavior(block, type, craftEngineItemKey(project, item), { auto_state: CE_DEFAULT_AUTO_STATE }),
  );
}

// --- Recipes -----------------------------------------------------------------------------------------

export function addRecipe(itemId: string, type: RecipeType): void {
  updateItem(itemId, (item) => {
    item.recipes.push(createRecipe(type, uid('r_')));
  });
}

export function removeRecipe(itemId: string, recipeId: string): void {
  updateItem(itemId, (item) => {
    item.recipes = item.recipes.filter((recipe) => recipe.id !== recipeId);
  });
}

/** Changes a recipe; equal `historyKey`s in quick succession form one undo step. */
export function updateRecipe(itemId: string, recipeId: string, recipe: (draft: Recipe) => void, historyKey = recipeId): void {
  updateItem(
    itemId,
    (item) => {
      const draft = item.recipes.find((candidate) => candidate.id === recipeId);
      if (draft) recipe(draft);
    },
    `recipe:${historyKey}`,
  );
}

export function deleteItem(itemId: string): void {
  mutate((draft) => operations.deleteItem(draft, itemId));
}

/** Moves an item into a folder, optionally before another item. */
export function moveItem(itemId: string, folderId: string, beforeItemId?: string): void {
  mutate((draft) => void operations.moveItem(draft, itemId, folderId, beforeItemId));
  setExpanded(folderId, true);
}

/** Copies an item next to the original and selects the copy; `displayName` is the copy's name. */
export function duplicateItem(itemId: string, displayName: string): string | null {
  const created: Item[] = [];
  mutate((draft) => {
    const copy = operations.duplicateItem(draft, itemId, displayName);
    if (copy) created.push(copy);
  });
  const [copy] = created;
  if (!copy) return null;
  select({ kind: 'item', id: copy.id });
  return copy.id;
}
