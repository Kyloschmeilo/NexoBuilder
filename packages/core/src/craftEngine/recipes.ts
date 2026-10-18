/**
 * CraftEngine recipes: the item's recipes under `recipes:` of its configuration file, keyed `<namespace>:<recipe key>`.
 * Keys and value formats come from the 26.9 plugin source (AbstractRecipeSerializer, the Custom…Recipe serializers)
 * and the wiki's recipe page. The result is always the item itself; the keys beyond the shared model (category,
 * processors, Premium conditions …) come from the recipe's options (recipeOptions.ts). Recipe types CraftEngine does
 * not read are left out (validateRecipes reports them).
 */
import { keyedRecipes, trimShape } from '../project/recipes/export';
import {
  getRecipeTypeInfo,
  type IngredientRef,
  INGREDIENT_LETTERS,
  isIngredientSourceAvailable,
  type Recipe,
  type RecipeIngredient,
  type RecipeSlot,
  type RecipeType,
  recipeSlot,
} from '../project/recipes/model';
import { optionsForType, writtenOptions } from '../project/recipes/options';
import type { Item, Project } from '../project/types';
import { CE_RECIPE_OPTIONS } from './recipeOptions';
import { craftEngineItemKey } from './yaml';

/** CraftEngine's recipe type of each recipe type of the model it reads. */
const CE_RECIPE_TYPES: Partial<Record<RecipeType, string>> = {
  shaped: 'shaped',
  shapeless: 'shapeless',
  furnace: 'smelting',
  blasting: 'blasting',
  smoking: 'smoking',
  campfire: 'campfire_cooking',
  stonecutting: 'stonecutting',
  shaped_transform: 'shaped_transform',
  shapeless_transform: 'shapeless_transform',
  brewing: 'brewing',
  smithing_transform: 'smithing_transform',
  smithing_trim: 'smithing_trim',
  dye: 'dye',
};

/** The key CraftEngine reads each slot from, where it differs from the slot's name. */
const SLOT_KEYS: Partial<Record<RecipeType, Partial<Record<RecipeSlot, string>>>> = {
  furnace: { input: 'ingredient' },
  blasting: { input: 'ingredient' },
  smoking: { input: 'ingredient' },
  campfire: { input: 'ingredient' },
  stonecutting: { input: 'ingredient' },
  brewing: { input: 'container', reagent: 'ingredient' },
  smithing_transform: { template: 'template_type' },
  smithing_trim: { template: 'template_type' },
  dye: { input: 'target' },
};

/** An item or tag as CraftEngine names it: `minecraft:diamond`, `<namespace>:<id>`, `#minecraft:planks`, `plugin:id`. */
function craftEngineId(project: Pick<Project, 'namespace'>, ref: IngredientRef): string | null {
  const id = ref.id.trim();
  if (!id || !isIngredientSourceAvailable(ref.source, 'craftengine')) return null;
  switch (ref.source) {
    case 'minecraft':
      return `minecraft:${id.toLowerCase()}`;
    case 'nexo':
      return `${project.namespace}:${id}`;
    case 'tag':
      return `#${id.includes(':') ? id : `minecraft:${id}`}`;
    default:
      return id;
  }
}

/**
 * An ingredient as CraftEngine reads it: one id, a list of ids (alternatives), or the object form
 * `{ items, count, predicate, source }` when it has more than its ids. Undefined when it names nothing CraftEngine reads.
 */
export function craftEngineIngredient(
  project: Pick<Project, 'namespace'>,
  ingredient: RecipeIngredient,
  type: RecipeType = 'shaped',
): unknown {
  const main = craftEngineId(project, ingredient);
  if (!main) return undefined;
  const alternatives = (ingredient.alternatives ?? []).map((ref) => craftEngineId(project, ref)).filter((id): id is string => !!id);
  const items = alternatives.length > 0 ? [main, ...alternatives] : main;
  const extras: Record<string, unknown> = {
    ...(ingredient.amount && ingredient.amount > 1 && { count: ingredient.amount }),
    ...writtenOptions(ingredient.options, optionsForType(CE_RECIPE_OPTIONS.ingredient, type)),
  };
  if (extras.source === false) delete extras.source;
  return Object.keys(extras).length > 0 ? { items, ...extras } : items;
}

/** The recipe's config under `recipes:`; null when CraftEngine has no type for it. */
export function craftEngineRecipe(
  project: Pick<Project, 'namespace'>,
  item: Pick<Item, 'itemId'>,
  recipe: Recipe,
): Record<string, unknown> | null {
  const type = CE_RECIPE_TYPES[recipe.type];
  if (!type) return null;
  const info = getRecipeTypeInfo(recipe.type);
  const ingredient = (value: RecipeIngredient) => craftEngineIngredient(project, value, recipe.type);
  const out: Record<string, unknown> = { type };
  if (info.kind === 'shaped') {
    const used = new Set(recipe.grid.filter(Boolean));
    out.pattern = trimShape(recipe.grid);
    const entries = INGREDIENT_LETTERS.filter((letter) => used.has(letter) && recipe.ingredients[letter])
      .map((letter) => [letter, ingredient(recipe.ingredients[letter])] as const)
      .filter(([, value]) => value !== undefined);
    out.ingredients = Object.fromEntries(entries);
  } else if (info.kind === 'shapeless') {
    out.ingredients = INGREDIENT_LETTERS.map((letter) => recipe.ingredients[letter])
      .filter((value): value is RecipeIngredient => Boolean(value))
      .map(ingredient)
      .filter((value) => value !== undefined);
  } else {
    for (const slot of info.slots) {
      const value = recipeSlot(recipe, slot);
      const yaml = value ? ingredient(value) : undefined;
      if (yaml !== undefined) out[SLOT_KEYS[recipe.type]?.[slot] ?? slot] = yaml;
    }
    if (info.kind === 'cooking') {
      out.time = Math.round(recipe.cookingTime);
      out.experience = recipe.experience;
    }
  }
  const options = optionsForType(CE_RECIPE_OPTIONS.recipe, recipe.type);
  if (info.hasResult) {
    out.result = {
      id: craftEngineItemKey(project, item),
      count: recipe.resultAmount,
      ...writtenOptions(
        recipe.options,
        options.filter((option) => option.inResult),
      ),
    };
  }
  return {
    ...out,
    ...writtenOptions(
      recipe.options,
      options.filter((option) => !option.inResult),
    ),
  };
}

/** The item's recipes under their CraftEngine keys, e.g. "ruby:ruby_sword_shaped" (the same keys as Nexo's). */
export function craftEngineRecipes(project: Pick<Project, 'namespace'>, item: Item): Record<string, Record<string, unknown>> {
  const recipes: Record<string, Record<string, unknown>> = {};
  for (const { key, recipe } of keyedRecipes(item)) {
    const config = craftEngineRecipe(project, item, recipe);
    if (config) recipes[`${project.namespace}:${key}`] = config;
  }
  return recipes;
}
