/**
 * CraftEngine recipes: the item's recipes under `recipes:` of its configuration file, keyed `<namespace>:<recipe key>`.
 * Keys and value formats come from the 26.9 plugin source (AbstractRecipeSerializer, the Custom…Recipe serializers)
 * and the jar's default_assets/configuration examples. The result is always the item itself; `visual_result` needs
 * CraftEngine Premium and is never written.
 */
import { keyedRecipes, trimShape } from '../project/recipes/export';
import { INGREDIENT_LETTERS, type Recipe, type RecipeIngredient, type RecipeType } from '../project/recipes/model';
import type { Item, Project } from '../project/types';
import { craftEngineItemKey } from './itemConfig';

/** CraftEngine's recipe type of each recipe type of the model. */
const CE_RECIPE_TYPES: Record<RecipeType, string> = {
  shaped: 'shaped',
  shapeless: 'shapeless',
  furnace: 'smelting',
  blasting: 'blasting',
  smoking: 'smoking',
  campfire: 'campfire_cooking',
  stonecutting: 'stonecutting',
};

/**
 * An ingredient as CraftEngine reads it: a vanilla item `minecraft:diamond`, a project item `<namespace>:<id>` or a tag
 * `#minecraft:planks`; with an amount above 1 the object form `{ items, count }`.
 */
export function craftEngineIngredient(project: Pick<Project, 'namespace'>, ingredient: RecipeIngredient): unknown {
  const id = ingredient.id.trim();
  const items =
    ingredient.source === 'minecraft'
      ? `minecraft:${id.toLowerCase()}`
      : ingredient.source === 'nexo'
        ? `${project.namespace}:${id}`
        : `#${id.includes(':') ? id : `minecraft:${id}`}`;
  return ingredient.amount && ingredient.amount > 1 ? { items, count: ingredient.amount } : items;
}

/** The recipe's config under `recipes:`; null when CraftEngine has no type for it. */
export function craftEngineRecipe(
  project: Pick<Project, 'namespace'>,
  item: Pick<Item, 'itemId'>,
  recipe: Recipe,
): Record<string, unknown> | null {
  const type = CE_RECIPE_TYPES[recipe.type] as string | undefined;
  if (!type) return null;
  const ingredient = (value: RecipeIngredient) => craftEngineIngredient(project, value);
  const out: Record<string, unknown> = { type };
  if (recipe.type === 'shaped') {
    const used = new Set(recipe.grid.filter(Boolean));
    out.pattern = trimShape(recipe.grid);
    out.ingredients = Object.fromEntries(
      INGREDIENT_LETTERS.filter((letter) => used.has(letter) && recipe.ingredients[letter]).map((letter) => [
        letter,
        ingredient(recipe.ingredients[letter]),
      ]),
    );
  } else if (recipe.type === 'shapeless') {
    out.ingredients = INGREDIENT_LETTERS.map((letter) => recipe.ingredients[letter])
      .filter((value): value is RecipeIngredient => Boolean(value?.id.trim()))
      .map(ingredient);
  } else {
    if (recipe.input) out.ingredient = ingredient(recipe.input);
    if (recipe.type !== 'stonecutting') {
      out.time = Math.round(recipe.cookingTime);
      out.experience = recipe.experience;
    }
  }
  out.result = { id: craftEngineItemKey(project, item), count: recipe.resultAmount };
  return out;
}

export interface CraftEngineItemRecipes {
  /** `<namespace>:<recipe key>` → recipe config */
  recipes: Record<string, Record<string, unknown>>;
  /** The keys (see recipeKeys) and types of the recipes CraftEngine has no type for */
  unsupported: Array<{ key: string; type: string }>;
}

/** The item's recipes under their CraftEngine keys, e.g. "ruby:ruby_sword_shaped" (the same keys as Nexo's). */
export function craftEngineRecipes(project: Pick<Project, 'namespace'>, item: Item): CraftEngineItemRecipes {
  const result: CraftEngineItemRecipes = { recipes: {}, unsupported: [] };
  for (const { key, recipe } of keyedRecipes(item)) {
    const config = craftEngineRecipe(project, item, recipe);
    if (config) result.recipes[`${project.namespace}:${key}`] = config;
    else result.unsupported.push({ key, type: recipe.type });
  }
  return result;
}
