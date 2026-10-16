/**
 * Targets and context frames ("where") of issues; each frame code is a message key in the `issues`
 * namespace. All `context.*` frames are built here so the app can rely on their codes and args.
 */
import { labelArg, type IssueContext, type IssueTarget } from './issues';
import type { VariantDef } from './nexo/variants';
import { itemLabel } from './project/labels';
import type { Item, Project } from './project/types';

/** Project list entries that issues can target (glyphs, sounds, paintings). */
export type MediaTargetKind = Exclude<IssueTarget['kind'], 'item' | 'folder'>;

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
export function mediaFrame(kind: MediaTargetKind, id: string): IssueContext {
  return { code: `context.${kind}`, args: { [kind]: id || '?' } };
}

/** A recipe; `key` is its unique key (see recipeKeys). */
export function recipeFrame(key: string): IssueContext {
  return { code: 'context.recipe', args: { recipe: key } };
}

/** The ingredient with `letter` of a crafting recipe. */
export function recipeIngredientFrame(key: string, letter: string): IssueContext {
  return { code: 'context.recipeIngredient', args: { recipe: key, letter } };
}

/** The single input of a furnace, stonecutter … recipe. */
export function recipeInputFrame(key: string): IssueContext {
  return { code: 'context.recipeInput', args: { recipe: key } };
}

/** A configuration property; `label` is a message key in the `schema` namespace. */
export function propertyFrame(label: string): IssueContext {
  return { code: 'context.property', args: { property: labelArg(label) } };
}

/** A field inside a property; `label` is a message key in the `schema` namespace. */
export function fieldFrame(label: string): IssueContext {
  return { code: 'context.field', args: { field: labelArg(label) } };
}

/** Entry `index` (counted from 1) of a list. */
export function listEntryFrame(index: number): IssueContext {
  return { code: 'context.listEntry', args: { index } };
}

export function mapKeyFrame(key: string): IssueContext {
  return { code: 'context.mapKey', args: { key } };
}

/** A variant slot, or with `suffix` (the end of its path) one model of it. */
export function variantFrame(def: VariantDef, suffix?: string): IssueContext {
  const variant = labelArg(def.label, def.params);
  return suffix === undefined
    ? { code: 'context.variant', args: { variant } }
    : { code: 'context.variantModel', args: { variant, suffix } };
}

/** An armor layer; `label` is a message key in the `schema` namespace. */
export function armorLayerFrame(label: string): IssueContext {
  return { code: 'context.armorLayer', args: { layer: labelArg(label) } };
}
