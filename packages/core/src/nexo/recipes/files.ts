/**
 * Export of recipes for Nexo: one file per recipe folder under plugins/Nexo/recipes/<folder>/ (the folder is the type
 * in lower case; both smithing types share `smithing`), plus recipes/disabled_recipes.yml with the vanilla recipes the
 * project disables. Format per the Nexo docs (general-usage/recipes) and the 1.30 recipe loaders. Recipe types and
 * ingredient sources Nexo does not read are left out (validateRecipes reports them).
 */
import { groupBy } from '@resourcepackbuilder/utils';
import type { Item, Project } from '../../project/types';
import { englishName } from '../../form/fields';
import { projectFileName } from '../../project/factory';
import { itemsToYaml } from '../yaml';
import { toYaml, yamlHeader } from '../../yaml';
import {
  getRecipeTypeInfo,
  type IngredientRef,
  INGREDIENT_LETTERS,
  isIngredientSourceAvailable,
  isRecipeTypeAvailable,
  type Recipe,
  type RecipeIngredient,
  type RecipeSlot,
  type RecipeType,
  recipeSlot,
  recipeTypesFor,
} from '../../project/recipes/model';
import { optionsForType, writtenOptions } from '../../project/recipes/options';
import { keyedRecipes, trimShape } from '../../project/recipes/export';
import { NEXO_RECIPE_OPTIONS, NEXO_REPLACEMENT_TYPES } from './options';

/** The folder under recipes/ Nexo loads each type from (the loaders' RecipeType names). */
const NEXO_RECIPE_FOLDERS: Partial<Record<RecipeType, string>> = {
  shaped: 'shaped',
  shapeless: 'shapeless',
  furnace: 'furnace',
  blasting: 'blasting',
  smoking: 'smoking',
  campfire: 'campfire',
  stonecutting: 'stonecutting',
  crafter: 'crafter',
  brewing: 'brewing',
  smithing_transform: 'smithing',
  smithing_trim: 'smithing',
  transmute: 'transmute',
  anvil: 'anvil',
};

/** The key Nexo reads each slot from, per type where it differs from the slot's name. */
const SLOT_KEYS: Partial<Record<RecipeSlot, string>> = { reagent: 'ingredient' };

/** The item or tag of an ingredient as Nexo reads it; null when Nexo has no such source. */
function refToYaml(ref: IngredientRef): Record<string, unknown> | null {
  const id = ref.id.trim();
  switch (ref.source) {
    case 'minecraft':
      return { minecraft_type: id.toUpperCase() };
    case 'nexo':
      return { nexo_item: id };
    case 'tag':
      return { tag: id };
    case 'crucible':
      return { crucible_item: id };
    case 'mmoitems':
      return { mmoitems_type: ref.itemType?.trim().toUpperCase() ?? '', mmoitems_id: id };
    default:
      return null;
  }
}

/** One ingredient with the predicates the recipe type reads; null when it is empty or Nexo cannot read its source. */
function ingredientToYaml(ingredient: RecipeIngredient, type: RecipeType): Record<string, unknown> | null {
  if (!ingredient.id.trim() || !isIngredientSourceAvailable(ingredient.source, 'nexo')) return null;
  const out = refToYaml(ingredient);
  if (!out) return null;
  if (ingredient.amount && ingredient.amount > 1) out.amount = ingredient.amount;
  if (NEXO_REPLACEMENT_TYPES.includes(type) && ingredient.replacement?.id.trim()) {
    const replacement = isIngredientSourceAvailable(ingredient.replacement.source, 'nexo') ? refToYaml(ingredient.replacement) : null;
    if (replacement) out.replacement = replacement;
  }
  return { ...out, ...writtenOptions(ingredient.options, optionsForType(NEXO_RECIPE_OPTIONS.ingredient, type)) };
}

/** The letter → ingredient map of a crafting recipe (shaped: only the letters its grid uses). */
function ingredientMap(recipe: Recipe, onlyLetters?: Set<string>): Record<string, unknown> {
  const ingredients: Record<string, unknown> = {};
  for (const letter of INGREDIENT_LETTERS) {
    const ingredient = recipe.ingredients[letter];
    if (!ingredient || (onlyLetters && !onlyLetters.has(letter))) continue;
    const yaml = ingredientToYaml(ingredient, recipe.type);
    if (yaml) ingredients[letter] = yaml;
  }
  return ingredients;
}

/** The YAML entry of one recipe (also the unit the recipe tests check). */
export function recipeToYaml(recipe: Recipe, item: Item): Record<string, unknown> {
  const info = getRecipeTypeInfo(recipe.type);
  const options = writtenOptions(recipe.options, optionsForType(NEXO_RECIPE_OPTIONS.recipe, recipe.type));
  const out: Record<string, unknown> = {};
  // An anvil recipe with a repair amount repairs its input instead of producing an item
  if (info.hasResult && options.repair === undefined) {
    const result: Record<string, unknown> = { nexo_item: item.itemId };
    if (recipe.resultAmount > 1) result.amount = recipe.resultAmount;
    out.result = result;
  }
  if (info.kind === 'shaped') {
    out.shape = trimShape(recipe.grid);
    out.ingredients = ingredientMap(recipe, new Set(recipe.grid.filter(Boolean)));
  } else if (info.kind === 'shapeless') {
    out.ingredients = ingredientMap(recipe);
  } else {
    for (const slot of info.slots) {
      const ingredient = recipeSlot(recipe, slot);
      const yaml = ingredient && ingredientToYaml(ingredient, recipe.type);
      if (yaml) out[SLOT_KEYS[slot] ?? slot] = yaml;
    }
    if (info.kind === 'cooking') {
      out.cookingTime = Math.round(recipe.cookingTime);
      out.experience = recipe.experience;
    }
  }
  return { ...out, ...options };
}

/** The recipe folder a type is written to, e.g. recipes/smithing/<project>.yml for both smithing types. */
export function recipeFilePath(project: Project, type: RecipeType): string {
  return `recipes/${NEXO_RECIPE_FOLDERS[type] ?? type}/${projectFileName(project)}.yml`;
}

/** Generates all recipe files of the project (path → YAML); recipe types Nexo does not read are left out. */
export function buildRecipeFiles(project: Project, items: Item[]): Map<string, string> {
  const keyed = items.flatMap((item) =>
    keyedRecipes(item)
      .filter(({ recipe }) => isRecipeTypeAvailable(recipe.type, 'nexo'))
      .map(({ key, recipe }) => ({ path: recipeFilePath(project, recipe.type), id: key, recipe, item })),
  );
  const byPath = groupBy(keyed, (entry) => entry.path);
  const files = new Map<string, string>();
  // In the order of the types, each folder once (smithing holds both smithing types)
  for (const info of recipeTypesFor('nexo')) {
    const path = recipeFilePath(project, info.type);
    const list = byPath.get(path);
    if (!list?.length || files.has(path)) continue;
    const entries = list.map(({ id, recipe, item }) => ({ id, config: recipeToYaml(recipe, item) }));
    files.set(path, itemsToYaml(entries, `${englishName(NEXO_RECIPE_FOLDERS[info.type] ?? info.type)} recipes`));
  }
  const disabled = disabledRecipesFile(project);
  if (disabled) files.set(DISABLED_RECIPES_FILE, disabled);
  return files;
}

/** Nexo's list of vanilla recipes it disables, under plugins/Nexo. */
export const DISABLED_RECIPES_FILE = 'recipes/disabled_recipes.yml';

/** The disabled_recipes.yml of the project: its trimmed, distinct recipe keys; null when it disables none. */
export function disabledRecipesFile(project: Project): string | null {
  const keys = [...new Set((project.settings.disabledRecipes ?? []).map((key) => key.trim()).filter(Boolean))];
  return keys.length > 0 ? yamlHeader('Disabled vanilla recipes') + toYaml({ disabled_recipes: keys }) : null;
}
