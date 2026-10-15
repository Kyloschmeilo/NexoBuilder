import type { Issue } from '@resourcepackbuilder/core/issues';

/** The issues of one recipe, sorted to where the recipe card shows them. */
export interface RecipeIssues {
  /** Issues of the whole recipe. */
  recipe: Issue[];
  /** Issues of the input of cooking and stonecutting recipes. */
  input: Issue[];
  /** Issues of each ingredient, by its letter. */
  ingredients: Map<string, Issue[]>;
}

const withoutContext = (issue: Issue): Issue => ({ ...issue, context: undefined });

/**
 * Sorts the issues of `validateRecipe` to the part of the recipe card they belong to. Their context frame
 * ("Recipe X, ingredient A") is dropped there because the place already says it; issues of letters that
 * have no ingredient row stay with the recipe and keep their frame.
 */
export function sortRecipeIssues(issues: Issue[], ingredientLetters: readonly string[]): RecipeIssues {
  const sorted: RecipeIssues = { recipe: [], input: [], ingredients: new Map() };
  for (const issue of issues) {
    const frame = issue.context?.[0];
    const letter = frame?.code === 'context.recipeIngredient' ? frame.args?.letter : undefined;
    if (typeof letter === 'string' && ingredientLetters.includes(letter)) {
      sorted.ingredients.set(letter, [...(sorted.ingredients.get(letter) ?? []), withoutContext(issue)]);
    } else if (frame?.code === 'context.recipeInput') {
      sorted.input.push(withoutContext(issue));
    } else if (frame?.code === 'context.recipe') {
      sorted.recipe.push(withoutContext(issue));
    } else {
      sorted.recipe.push(issue);
    }
  }
  return sorted;
}
