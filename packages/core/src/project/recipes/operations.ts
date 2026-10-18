/** Edits of a recipe's ingredients; the functions mutate the recipe (for Immer drafts or tests). */
import { emptyIngredient, type IngredientRef, INGREDIENT_LETTERS, type Recipe, type RecipeIngredient, type RecipeSlot } from './model';

/** Game ticks per second (cooking times are stored in ticks). */
export const TICKS_PER_SECOND = 20;

/** The letters that have an ingredient, in order. */
export function ingredientLetters(recipe: Recipe): string[] {
  return INGREDIENT_LETTERS.filter((letter) => recipe.ingredients[letter]);
}

/** The first letter without an ingredient, or `undefined` when all are taken. */
export function nextIngredientLetter(recipe: Recipe): string | undefined {
  return INGREDIENT_LETTERS.find((letter) => !recipe.ingredients[letter]);
}

/** Adds an empty ingredient under the next free letter; returns the letter (`undefined`: no letter left). */
export function addIngredient(recipe: Recipe): string | undefined {
  const letter = nextIngredientLetter(recipe);
  if (letter) recipe.ingredients[letter] = emptyIngredient();
  return letter;
}

/** Removes an ingredient and clears the grid slots that used its letter. */
export function removeIngredient(recipe: Recipe, letter: string): void {
  delete recipe.ingredients[letter];
  recipe.grid = recipe.grid.map((slot) => (slot === letter ? '' : slot));
}

/** The ingredient with a typed ID: Minecraft materials are upper case. */
export function withIngredientId<T extends IngredientRef>(ingredient: T, id: string): T {
  return { ...ingredient, id: ingredient.source === 'minecraft' ? id.toUpperCase() : id };
}

/** The ingredient from another source; only MMOItems ingredients keep their item type. */
export function withIngredientSource<T extends IngredientRef>(ingredient: T, source: IngredientRef['source']): T {
  const next = { ...ingredient, source };
  if (source !== 'mmoitems') delete next.itemType;
  return withIngredientId(next, next.id);
}

/** Puts an ingredient into a single slot of the recipe (`input` or one of `slots`). */
export function setRecipeSlot(recipe: Recipe, slot: RecipeSlot, ingredient: RecipeIngredient): void {
  if (slot === 'input') recipe.input = ingredient;
  else recipe.slots = { ...recipe.slots, [slot]: ingredient };
}

/** The ingredient with an amount; one (or none) is the default and is not stored. */
export function withIngredientAmount(ingredient: RecipeIngredient, amount: number | undefined): RecipeIngredient {
  const next = { ...ingredient };
  if (amount && amount > 1) next.amount = amount;
  else delete next.amount;
  return next;
}
