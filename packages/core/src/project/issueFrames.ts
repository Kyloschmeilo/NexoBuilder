/**
 * Targets and context frames ("where") of issues; each frame code is a message key in the `issues`
 * namespace. All `context.*` frames are built here so the app can rely on their codes and args.
 */
import { labelArg, schemaKey, type IssueContext, type IssueTarget } from '@resourcepackbuilder/utils';
import type { MediaKind } from './media/kinds';
import { recipeSlotLabel, type RecipeSlot } from './recipes/model';
import type { VariantDef } from './variants';
import { itemLabel } from './item';
import type { Item, Project } from './types';

export function itemTarget(item: Item): IssueTarget {
  return { kind: 'item', id: item.id };
}

export function itemFrame(item: Item): IssueContext {
  return { code: 'context.item', args: { item: itemLabel(item) } };
}

export function projectFrame(project: Project): IssueContext {
  return { code: 'context.project', args: { project: project.name } };
}

/** A glyph, sound or painting, named by its user-facing ID (`context.glyph` with `{ glyph }` …). */
export function mediaFrame(kind: MediaKind, id: string): IssueContext {
  return { code: `context.${kind}`, args: { [kind]: id || '?' } };
}

/** Codes of the recipe frames; each carries the recipe key as `recipe` (the ingredient frame also `letter`). */
export const RECIPE_FRAME_CODES = {
  recipe: 'context.recipe',
  ingredient: 'context.recipeIngredient',
  input: 'context.recipeInput',
  slot: 'context.recipeSlot',
} as const;

/** A recipe; `key` is its unique key (see recipeKeys). */
export function recipeFrame(key: string): IssueContext {
  return { code: RECIPE_FRAME_CODES.recipe, args: { recipe: key } };
}

/** The ingredient with `letter` of a crafting recipe. */
export function recipeIngredientFrame(key: string, letter: string): IssueContext {
  return { code: RECIPE_FRAME_CODES.ingredient, args: { recipe: key, letter } };
}

/** The single input of a furnace, stonecutter … recipe. */
export function recipeInputFrame(key: string): IssueContext {
  return { code: RECIPE_FRAME_CODES.input, args: { recipe: key } };
}

/** A named single slot of a recipe (brewing reagent, smithing base …); `slot` is translated by its schema label. */
export function recipeSlotFrame(key: string, slot: RecipeSlot): IssueContext {
  return { code: RECIPE_FRAME_CODES.slot, args: { recipe: key, slot: labelArg(schemaKey(recipeSlotLabel(slot))), slotName: slot } };
}

/** A configuration property; `label` is a message key in the `schema` namespace. */
export function propertyFrame(label: string): IssueContext {
  return { code: 'context.property', args: { property: labelArg(schemaKey(label)) } };
}

/** A field inside a property; `label` is a message key in the `schema` namespace. */
export function fieldFrame(label: string): IssueContext {
  return { code: 'context.field', args: { field: labelArg(schemaKey(label)) } };
}

/** Entry `index` (counted from 1) of a list. */
export function listEntryFrame(index: number): IssueContext {
  return { code: 'context.listEntry', args: { index } };
}

/** A CraftEngine loot source, named by its id. */
export function lootSourceFrame(id: string): IssueContext {
  return { code: 'context.lootSource', args: { id: id || '?' } };
}

/** A CraftEngine template of the project, named by its id. */
export function templateFrame(id: string): IssueContext {
  return { code: 'context.template', args: { id: id || '?' } };
}

/** The kind of an entry of a CraftEngine project section; it names the entry's frame (`context.<kind>`). */
export type ProjectEntryKind = 'category' | 'configuredFeature' | 'placedFeature' | 'atlas' | 'configFactory' | 'script';

/** An entry of a CraftEngine project section (`context.category`, `context.placedFeature`, …), named by its id. */
export function projectEntryFrame(kind: ProjectEntryKind, id: string): IssueContext {
  return { code: `context.${kind}`, args: { id: id || '?' } };
}

/**
 * Entry `index` (counted from 1) of a CraftEngine project section, for an entry without an id. It reads like
 * {@link listEntryFrame}; its `section` arg keeps the entry's kind so the section's checks can be told apart.
 */
export function projectListEntryFrame(kind: ProjectEntryKind, index: number): IssueContext {
  return { code: 'context.listEntry', args: { index, section: kind } };
}

/** Whether `frame` names an entry of kind `kind` of a CraftEngine project section, by its id or its position. */
export function isProjectEntryFrame(frame: IssueContext, kind: ProjectEntryKind): boolean {
  return frame.code === `context.${kind}` || (frame.code === 'context.listEntry' && frame.args?.section === kind);
}

/**
 * An entry of a CraftEngine project's attribute system (`context.attribute`, `context.attributeOperation`,
 * `context.equipmentSet`, `context.damageRule`), named by its id (a damage rule by its damage type) or its position.
 */
export function attributeEntryFrame(
  kind: 'attribute' | 'attributeOperation' | 'equipmentSet' | 'damageRule',
  id: string,
  index: number,
): IssueContext {
  return { code: `context.${kind}`, args: { id: id || `#${index}` } };
}

export function mapKeyFrame(key: string): IssueContext {
  return { code: 'context.mapKey', args: { key } };
}

/** A variant slot, or with `suffix` (the end of its path) one model of it. */
export function variantFrame(def: VariantDef, suffix?: string): IssueContext {
  const variant = labelArg(schemaKey(def.label), def.params);
  return suffix === undefined
    ? { code: 'context.variant', args: { variant } }
    : { code: 'context.variantModel', args: { variant, suffix } };
}

/** An armor layer; `label` is a message key in the `schema` namespace. */
export function armorLayerFrame(label: string): IssueContext {
  return { code: 'context.armorLayer', args: { layer: labelArg(schemaKey(label)) } };
}
