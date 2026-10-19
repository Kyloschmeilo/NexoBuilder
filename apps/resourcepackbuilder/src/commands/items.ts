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
import { getPropertyValue, propertyById, type PropertyDef, setPropertyValue } from '@resourcepackbuilder/core/form';
import { formFor } from '@resourcepackbuilder/core/targets';
import {
  addBlockBehavior as withAddedBlockBehavior,
  type ApplyBlockBehaviorOptions,
  type BlockBehaviorRef,
  CE_DEFAULT_AUTO_STATE,
  craftEngineItemKey,
  newCraftEngineBlock,
  newCraftEngineFurniture,
  promoteBlockBehavior as withPromotedBlockBehavior,
  setStorageOpenLook,
  withBlockBehavior,
} from '@resourcepackbuilder/core/craftEngine';
import { getProject, mutate } from '../store/project';
import { select, setExpanded } from '../store/ui';
import { NEXO_FURNITURE_PATH, NEXO_FURNITURE_PROPERTY, withoutVariant, withVariant } from '../features/item/furniture/model';

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
  const next = produce(item, (draft) => {
    recipe(draft);
  });
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

/** Sets several property values of an item in one undo step (e.g. the settings added from a catalog at once). */
export function setItemProperties(itemId: string, values: ReadonlyArray<readonly [PropertyDef, ConfigValue | undefined]>): void {
  updateItem(itemId, (item) => {
    for (const [def, value] of values) setPropertyValue(item, def, value);
  });
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

/**
 * Replaces the item's furniture with what `next` makes of it; equal `historyKey`s in quick succession form one undo
 * step.
 */
export function updateCraftEngineFurniture(itemId: string, next: (furniture: ConfigObject) => ConfigObject, historyKey?: string): void {
  updateItem(
    itemId,
    (item) => {
      const furniture = item.config.furniture;
      if (!isPlainObject(furniture)) return;
      item.config.furniture = next(isDraft(furniture) ? current(furniture) : furniture);
    },
    historyKey,
  );
}

/** Gives the item's storage block a closed and an open look (the `open` property), or takes them away. */
export function setBlockStorageOpenLook(itemId: string, open: boolean): void {
  updateCraftEngineBlock(itemId, (block) => setStorageOpenLook(block, open));
}

/** What an item places when it is used: nothing, a block or furniture (one of them at most). */
export type ItemPlaces = 'nothing' | 'block' | 'furniture';

/** The Nexo mechanics that make an item a custom block or furniture (the furniture one lives with the furniture helpers). */
export const NEXO_BLOCK_PROPERTY = 'Mechanics.custom_block';
export { NEXO_FURNITURE_PROPERTY };

/**
 * Makes the item place nothing, a block or furniture. CraftEngine writes a new `block` or `furniture` definition,
 * Nexo the custom_block or furniture mechanic with its default; the other one is removed (with the extra textures
 * only it used). What the item already places stays as it is.
 */
export function setItemPlaces(itemId: string, places: ItemPlaces): void {
  const project = getProject();
  if (!project) return;
  if (project.target === 'craftengine') {
    updateItem(itemId, (item) => {
      if (places !== 'block') delete item.config.block;
      else if (!isPlainObject(item.config.block)) item.config.block = newCraftEngineBlock();
      if (places !== 'furniture') delete item.config.furniture;
      else if (!isPlainObject(item.config.furniture)) item.config.furniture = newCraftEngineFurniture();
    });
    return;
  }
  const block = projectProperty(NEXO_BLOCK_PROPERTY);
  const furniture = projectProperty(NEXO_FURNITURE_PROPERTY);
  updateItem(itemId, (item) => {
    for (const [def, wanted] of [
      [block, places === 'block'],
      [furniture, places === 'furniture'],
    ] as const) {
      if (!def) continue;
      if (!wanted) setPropertyValue(item, def, undefined);
      else if (getPropertyValue(item, def) === undefined) setPropertyValue(item, def, def.defaultValue());
    }
    pruneUnusedAssets(item);
  });
}

/** Runs a block edit that needs the item's key and the plain single state (adding or promoting a preset). */
function updateBlockWithKey(itemId: string, next: (block: ConfigObject, itemKey: string, singleState: ConfigObject) => ConfigObject): void {
  const project = getProject();
  const item = project?.items[itemId];
  if (!project || !item) return;
  const itemKey = craftEngineItemKey(project, item);
  updateCraftEngineBlock(itemId, (block) => next(block, itemKey, { auto_state: CE_DEFAULT_AUTO_STATE }));
}

/**
 * Adds behaviors of these types to the item's block (in order; types it has are skipped). The first type with a
 * preset sets up the main behavior with its states while the block has none; the others go to the further behaviors.
 * `replaceStates` lets a preset replace states of the user's own (after asking).
 */
export function addBlockBehaviors(itemId: string, types: readonly string[], options?: ApplyBlockBehaviorOptions): void {
  updateBlockWithKey(itemId, (block, itemKey, singleState) =>
    types.reduce((next, type) => withAddedBlockBehavior(next, type, itemKey, singleState, options), block),
  );
}

/** Replaces one behavior of the item's block; equal `historyKey`s in quick succession form one undo step. */
export function updateBlockBehavior(itemId: string, ref: BlockBehaviorRef, entry: ConfigValue, historyKey?: string): void {
  updateCraftEngineBlock(itemId, (block) => withBlockBehavior(block, ref, entry), historyKey);
}

/** Removes one behavior of the item's block; its states and the other behaviors stay. */
export function removeBlockBehavior(itemId: string, ref: BlockBehaviorRef): void {
  updateCraftEngineBlock(itemId, (block) => withBlockBehavior(block, ref, undefined));
}

/** Makes a further behavior with a preset the block's main behavior, with the states its preset sets up. */
export function promoteBlockBehavior(itemId: string, ref: BlockBehaviorRef, options?: ApplyBlockBehaviorOptions): void {
  updateBlockWithKey(itemId, (block, itemKey, singleState) => withPromotedBlockBehavior(block, ref, itemKey, singleState, options));
}

// --- Recipes -----------------------------------------------------------------------------------------

/** Appends a new recipe of the type to the item; returns the new recipe's id. */
export function addRecipe(itemId: string, type: RecipeType): string {
  const id = uid('r_');
  updateItem(itemId, (item) => {
    item.recipes.push(createRecipe(type, id));
  });
  return id;
}

/** Inserts a copy of the recipe right below it; returns the copy's id, or null when there is no such recipe. */
export function duplicateRecipe(itemId: string, recipeId: string): string | null {
  const id = uid('r_');
  let copied = false;
  updateItem(itemId, (item) => {
    const index = item.recipes.findIndex((recipe) => recipe.id === recipeId);
    if (index < 0) return;
    item.recipes.splice(index + 1, 0, { ...current(item.recipes[index]), id });
    copied = true;
  });
  return copied ? id : null;
}

/** Moves the recipe `delta` places up (negative) or down in the item's list; nothing happens at the ends. */
export function moveRecipe(itemId: string, recipeId: string, delta: number): void {
  updateItem(itemId, (item) => {
    const from = item.recipes.findIndex((recipe) => recipe.id === recipeId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= item.recipes.length) return;
    const [recipe] = item.recipes.splice(from, 1);
    item.recipes.splice(to, 0, recipe);
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

// --- Furniture: variants and the Nexo furniture mechanic ------------------------------------------------

/** Adds the variant `name` (one element and one hitbox) to the item's CraftEngine furniture. */
export function addCraftEngineFurnitureVariant(itemId: string, name: string): void {
  updateCraftEngineFurniture(itemId, (furniture) => withVariant(furniture, name));
}

/** Removes the variant `name` and its placement rule from the item's CraftEngine furniture. */
export function removeCraftEngineFurnitureVariant(itemId: string, name: string): void {
  updateCraftEngineFurniture(itemId, (furniture) => withoutVariant(furniture, name));
}

/**
 * Replaces the item's Nexo furniture mechanic (`Mechanics.furniture`) with what `next` makes of it; nothing happens
 * while the item has none. Equal `historyKey`s in quick succession form one undo step.
 */
export function updateNexoFurniture(itemId: string, next: (furniture: ConfigObject) => ConfigObject, historyKey?: string): void {
  updateItem(
    itemId,
    (item) => {
      const furniture = operations.getPath(item.config, NEXO_FURNITURE_PATH);
      if (!isPlainObject(furniture)) return;
      setPath(item.config, NEXO_FURNITURE_PATH, next(isDraft(furniture) ? current(furniture) : furniture));
    },
    historyKey,
  );
}
