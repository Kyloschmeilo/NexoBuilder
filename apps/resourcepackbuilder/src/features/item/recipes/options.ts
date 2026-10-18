/**
 * Which of the target's recipe and ingredient keys a recipe editor shows right away and which it folds into "More
 * options". Keys that belong to one or two recipe types and are not advanced are part of what the type is about (a
 * trim pattern, an anvil's cost, the source ingredient of a transform recipe), so they stay visible; keys every type
 * shares (groups, categories, unlocks, permissions, processors) are rarely needed and wait behind the disclosure. Keys
 * of the paid edition get a disclosure of their own.
 */
import type { Field, ObjectField } from '@resourcepackbuilder/core/form';
import { type ConfigObject, optionsField, type RecipeOption } from '@resourcepackbuilder/core/project';
import { isPlainObject } from '@resourcepackbuilder/utils';

/** The most recipe types a key may belong to and still count as part of the type. */
const MAX_TYPES_OF_PRIMARY = 2;

/** Whether a key is shown with the recipe's own fields instead of under "More options". */
export function isPrimaryRecipeOption(option: RecipeOption): boolean {
  return !option.premium && !option.field.advanced && option.types.length <= MAX_TYPES_OF_PRIMARY;
}

/** A recipe type's keys, split into the shown ones, those under "More options" and those of the paid edition. */
export interface RecipeOptionGroups {
  primary: RecipeOption[];
  more: RecipeOption[];
  premium: RecipeOption[];
}

/** Splits the keys a recipe type reads into the three groups of the editor, keeping their order. */
export function groupRecipeOptions(options: readonly RecipeOption[]): RecipeOptionGroups {
  return {
    primary: options.filter(isPrimaryRecipeOption),
    more: options.filter((option) => !option.premium && !isPrimaryRecipeOption(option)),
    premium: options.filter((option) => option.premium),
  };
}

/**
 * The keys as one object field for the form renderer. The editor already decided where each key goes, so the fields
 * are marked as not advanced: the renderer must not fold them into a second "More options" inside the first.
 */
export function flatOptionsField(options: readonly RecipeOption[], label: string): ObjectField {
  const field = optionsField(options, label);
  return { ...field, fields: field.fields.map((f): Field => ({ ...f, advanced: false })) };
}

/** The values of `options` under the keys of a group, for the group's form. */
export function pickOptionKeys(options: ConfigObject | undefined, group: readonly RecipeOption[]): ConfigObject {
  const keys = new Set(group.map((option) => option.field.key));
  return Object.fromEntries(Object.entries(options ?? {}).filter(([key]) => keys.has(key)));
}

/**
 * Writes a group's form value back into the stored `options`: the group's keys take the new values (or go when they
 * are empty), every other key (another group's, the other target's) stays as it is. Undefined when nothing is left.
 */
export function mergeOptionKeys(
  options: ConfigObject | undefined,
  group: readonly RecipeOption[],
  next: unknown,
): ConfigObject | undefined {
  const merged: ConfigObject = { ...options, ...(isPlainObject(next) ? (next as ConfigObject) : {}) };
  for (const { field } of group) if (!isPlainObject(next) || next[field.key] === undefined) delete merged[field.key];
  return Object.keys(merged).length > 0 ? merged : undefined;
}
