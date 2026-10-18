/**
 * The keys of a recipe (and of its ingredients) that only one target reads, described as form fields: each target
 * lists them with the recipe types that read them (nexo/recipes/options.ts, craftEngine/recipeOptions.ts). The
 * values are stored under the field's key in `Recipe.options` / `RecipeIngredient.options`; a target's export writes
 * the keys it lists for the type, pruned like any form value, and leaves the others stored but unwritten.
 */
import type { Field, ObjectField } from '../../form/fields';
import { labeledOptions, plainOptions } from '../../form/options';
import { pruneValue } from '../../form/prune';
import { isPlainObject } from '@resourcepackbuilder/utils';
import type { ConfigObject, ConfigValue } from '../types';
import type { RecipeType } from './model';

/** One key of a recipe or of an ingredient; `field.key` is its YAML name and `field.docs` its documentation. */
export interface RecipeOption {
  field: Field;
  /** The recipe types whose recipes (or ingredients) read the key */
  types: readonly RecipeType[];
  /** Only the paid edition of the plugin reads the key (CraftEngine Premium) */
  premium?: boolean;
  /** Written into the recipe's result instead of the recipe itself (CraftEngine's `post_processors`) */
  inResult?: boolean;
}

/** The keys a target reads beyond the shared model: on the recipe and on each ingredient. */
export interface RecipeTargetOptions {
  recipe: readonly RecipeOption[];
  ingredient: readonly RecipeOption[];
}

/** The recipe book tabs of crafting recipes (`category`), labeled at `recipes.categories.<value>.label`. */
export const RECIPE_CRAFTING_CATEGORIES = labeledOptions('recipes.categories', ['building', 'redstone', 'equipment', 'misc']);
/** The recipe book tabs of cooking recipes (`category`), labeled at `recipes.categories.<value>.label`. */
export const RECIPE_COOKING_CATEGORIES = labeledOptions('recipes.categories', ['food', 'blocks', 'misc']);

/** Vanilla armor trim patterns (`minecraft:bolt`) as suggestions for a trim recipe's pattern. */
export const VANILLA_TRIM_PATTERNS = plainOptions(
  [
    'bolt',
    'coast',
    'dune',
    'eye',
    'flow',
    'host',
    'raiser',
    'rib',
    'sentry',
    'shaper',
    'silence',
    'snout',
    'spire',
    'tide',
    'vex',
    'ward',
    'wayfinder',
    'wild',
  ].map((name) => `minecraft:${name}`),
);

/** The options a recipe of the type reads, optionally only the (non-)premium ones. */
export function optionsForType(options: readonly RecipeOption[], type: RecipeType, premium?: boolean): RecipeOption[] {
  return options.filter((option) => option.types.includes(type) && (premium === undefined || !!option.premium === premium));
}

/**
 * The options as one object field (no own label: `label` names the section), for the generic form renderer. Its
 * value is the `options` object of the recipe or ingredient.
 */
export function optionsField(options: readonly RecipeOption[], label: string): ObjectField {
  return { type: 'object', key: '', label, fields: options.map((option) => option.field) };
}

/**
 * The values of the options (by YAML key) the target writes, pruned by their fields; empty values and keys the
 * target does not list for the type are left out.
 */
export function writtenOptions(values: ConfigObject | undefined, options: readonly RecipeOption[]): Record<string, ConfigValue> {
  const out: Record<string, ConfigValue> = {};
  if (!isPlainObject(values)) return out;
  for (const option of options) {
    const key = option.field.key;
    if (values[key] === undefined) continue;
    const pruned = pruneValue(values[key], option.field);
    if (pruned !== undefined) out[key] = pruned as ConfigValue;
  }
  return out;
}
