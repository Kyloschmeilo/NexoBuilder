/**
 * Crafting recipes for Nexo (plugins/Nexo/recipes/<type>/…yml).
 * Format per the Nexo docs (general-usage/recipes): each recipe type has its own folder,
 * the folder name is the type in lowercase (shaped, shapeless, furnace, …).
 */

export type RecipeType = 'shaped' | 'shapeless' | 'furnace' | 'blasting' | 'smoking' | 'campfire' | 'stonecutting';

export type IngredientSource = 'minecraft' | 'nexo' | 'tag';

export interface RecipeIngredient {
  source: IngredientSource;
  id: string;
  /** Required amount per slot (Nexo amount predicate) */
  amount?: number;
}

export interface Recipe {
  id: string;
  type: RecipeType;
  /** Number of produced items */
  resultAmount: number;
  /** shaped: 9 cells (row by row), each a letter from `ingredients` or '' */
  grid: string[];
  /** shaped/shapeless: letter → ingredient */
  ingredients: Record<string, RecipeIngredient>;
  /** Furnaces & stonecutter: input */
  input: RecipeIngredient | null;
  /** Furnaces: duration in ticks */
  cookingTime: number;
  experience: number;
}

export interface RecipeTypeInfo {
  type: RecipeType;
  /** Message key in the `schema` namespace */
  label: string;
  /** Message key in the `schema` namespace */
  description: string;
  kind: 'shaped' | 'shapeless' | 'cooking' | 'stonecutting';
  defaultCookingTime?: number;
}

/** A recipe type whose messages live at `recipes.types.<type>` */
const recipeType = (type: RecipeType, kind: RecipeTypeInfo['kind'], defaultCookingTime?: number): RecipeTypeInfo => ({
  type,
  label: `recipes.types.${type}.label`,
  description: `recipes.types.${type}.description`,
  kind,
  ...(defaultCookingTime !== undefined && { defaultCookingTime }),
});

export const RECIPE_TYPES: RecipeTypeInfo[] = [
  recipeType('shaped', 'shaped'),
  recipeType('shapeless', 'shapeless'),
  recipeType('furnace', 'cooking', 200),
  recipeType('blasting', 'cooking', 100),
  recipeType('smoking', 'cooking', 100),
  recipeType('campfire', 'cooking', 600),
  recipeType('stonecutting', 'stonecutting'),
];

export function getRecipeTypeInfo(type: RecipeType): RecipeTypeInfo {
  return RECIPE_TYPES.find((t) => t.type === type) ?? RECIPE_TYPES[0];
}

/** `label` is a message key in the `schema` namespace. */
export const INGREDIENT_SOURCES: Array<{ value: IngredientSource; label: string }> = (['minecraft', 'nexo', 'tag'] as const).map((value) => ({
  value,
  label: `recipes.sources.${value}`,
}));

export const INGREDIENT_LETTERS = 'ABCDEFGHI'.split('');

export function createRecipe(type: RecipeType, id: string): Recipe {
  return {
    id,
    type,
    resultAmount: 1,
    grid: Array(9).fill(''),
    ingredients: type === 'shaped' || type === 'shapeless' ? { A: { source: 'minecraft', id: '' } } : {},
    input: type === 'shaped' || type === 'shapeless' ? null : { source: 'minecraft', id: '' },
    cookingTime: getRecipeTypeInfo(type).defaultCookingTime ?? 200,
    experience: 0.1,
  };
}
