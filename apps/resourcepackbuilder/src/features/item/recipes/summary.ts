/**
 * The one-line summary of a collapsed recipe row: what goes in (the ingredients of a crafting recipe, the slots of the
 * other types joined by "+"), the cooking time, and how many items it makes when that is more than one.
 */
import {
  getRecipeTypeInfo,
  ingredientLetters,
  isSlotOptional,
  type PackTargetId,
  type Recipe,
  type RecipeIngredient,
  recipeSlot,
  TICKS_PER_SECOND,
} from '@resourcepackbuilder/core/project';

/** The translated words of a summary. */
export interface RecipeSummaryText {
  /** A slot without an item: "empty". */
  empty: string;
  /** A crafting recipe whose ingredients are all blank. */
  noIngredients: string;
  /** A cooking time: "10 s". */
  seconds: (seconds: number) => string;
  /** The result amount above one: "makes 4". */
  makes: (amount: number) => string;
}

/** How many ingredient names a crafting summary lists before "+n". */
const MAX_LISTED = 3;

/** An ingredient as it reads in a summary: "DIAMOND", "#planks", "SWORD:ruby_blade", with "×2" for an amount. */
export function ingredientName(ingredient: RecipeIngredient | null | undefined): string | null {
  const id = ingredient?.id.trim();
  if (!ingredient || !id) return null;
  const name =
    ingredient.source === 'tag' ? `#${id}` : ingredient.source === 'mmoitems' && ingredient.itemType ? `${ingredient.itemType}:${id}` : id;
  return ingredient.amount && ingredient.amount > 1 ? `${name} ×${ingredient.amount}` : name;
}

/** The names in `list`, at most {@link MAX_LISTED} of them and "+n" for the rest. */
function listed(names: string[]): string {
  const rest = names.length - MAX_LISTED;
  return rest > 0 ? `${names.slice(0, MAX_LISTED).join(', ')} +${rest}` : names.join(', ');
}

/** The summary of a recipe for the project's target, e.g. "DIAMOND, STICK · makes 4" or "RAW_RUBY · 10 s". */
export function recipeSummary(recipe: Recipe, target: PackTargetId, text: RecipeSummaryText): string {
  const info = getRecipeTypeInfo(recipe.type);
  const parts: string[] = [];
  if (info.kind === 'shaped' || info.kind === 'shapeless') {
    const names = [...new Set(ingredientLetters(recipe).flatMap((letter) => ingredientName(recipe.ingredients[letter]) ?? []))];
    parts.push(names.length > 0 ? listed(names) : text.noIngredients);
  } else {
    const slots = info.slots.flatMap((slot) => {
      const name = ingredientName(recipeSlot(recipe, slot));
      // An optional slot left empty is not missing, so it is left out
      if (!name && isSlotOptional(recipe.type, slot, target)) return [];
      return [name ?? text.empty];
    });
    if (slots.length > 0) parts.push(slots.join(' + '));
  }
  if (info.kind === 'cooking') parts.push(text.seconds(recipe.cookingTime / TICKS_PER_SECOND));
  if (info.hasResult && recipe.resultAmount > 1) parts.push(text.makes(recipe.resultAmount));
  return parts.join(' · ');
}
