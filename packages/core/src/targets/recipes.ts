/**
 * The recipe data of each target in one place: the keys it reads beyond the shared recipe model, the documentation
 * of each recipe type, and every message key the recipe editor uses (for the catalogue tests).
 */
import { CE_RECIPE_DOCS, CE_DOCS } from '../craftEngine/form/schema/docs';
import {
  CE_INGREDIENT_PREDICATES,
  CE_RECIPE_OPTIONS,
  CE_RESULT_POST_PROCESSORS,
  CE_TRANSFORM_PROCESSORS,
} from '../craftEngine/recipeOptions';
import type { TypedType } from '../form/fields';
import { fieldMessageKeys, optionMessageKeys } from '../form/messageKeys';
import { NEXO_DOCS, NEXO_RECIPE_DOCS } from '../nexo/form/schema/docs';
import { NEXO_DISABLED_RECIPES_FIELD, NEXO_RECIPE_OPTIONS } from '../nexo/recipes/options';
import { INGREDIENT_SOURCES, RECIPE_SLOTS, RECIPE_TYPES, recipeSlotHelp, recipeSlotLabel, type RecipeType } from '../project/recipes/model';
import { RECIPE_COOKING_CATEGORIES, RECIPE_CRAFTING_CATEGORIES, type RecipeTargetOptions } from '../project/recipes/options';
import type { PackTargetId } from '../project/target';

const OPTIONS: Record<PackTargetId, RecipeTargetOptions> = { nexo: NEXO_RECIPE_OPTIONS, craftengine: CE_RECIPE_OPTIONS };

/** The keys the target reads on recipes and ingredients beyond the shared model. */
export function recipeOptionsFor(target: PackTargetId): RecipeTargetOptions {
  return OPTIONS[target];
}

/** The target's documentation of a recipe type; its recipes page for a type it does not read. */
export function recipeDocsFor(target: PackTargetId, type: RecipeType): string {
  return target === 'craftengine' ? (CE_RECIPE_DOCS[type] ?? CE_DOCS.recipes) : (NEXO_RECIPE_DOCS[type] ?? NEXO_DOCS.recipes.page);
}

/** Message keys of the section titles of the recipe editor (`schema` namespace). */
export const RECIPE_SECTION_LABELS = {
  options: 'recipes.sections.options.label',
  premium: 'recipes.sections.premium.label',
  ingredient: 'recipes.sections.ingredient.label',
} as const;

const typeKeys = (types: readonly TypedType[]) =>
  types.flatMap((t) => [t.label, ...(t.help ? [t.help] : []), ...t.fields.flatMap(fieldMessageKeys)]);

/** Every message key of the recipe editor's shared data in the `schema` namespace. */
export function recipeMessageKeys(): string[] {
  return [
    ...RECIPE_TYPES.flatMap((type) => [type.label, type.description]),
    ...INGREDIENT_SOURCES.map((source) => source.label),
    ...RECIPE_SLOTS.flatMap((slot) => [recipeSlotLabel(slot), recipeSlotHelp(slot)]),
    ...optionMessageKeys(RECIPE_CRAFTING_CATEGORIES),
    ...optionMessageKeys(RECIPE_COOKING_CATEGORIES),
    ...Object.values(OPTIONS).flatMap(({ recipe, ingredient }) =>
      [...recipe, ...ingredient].flatMap((option) => fieldMessageKeys(option.field)),
    ),
    ...typeKeys(CE_TRANSFORM_PROCESSORS),
    ...typeKeys(CE_RESULT_POST_PROCESSORS),
    ...typeKeys(CE_INGREDIENT_PREDICATES),
    ...fieldMessageKeys(NEXO_DISABLED_RECIPES_FIELD),
    ...Object.values(RECIPE_SECTION_LABELS),
  ];
}
