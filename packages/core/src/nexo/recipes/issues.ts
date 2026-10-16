/** The issues of one recipe, picked from the export plan and sorted to the parts of the recipe they concern. */
import { RECIPE_FRAME_CODES } from '../../project/issueFrames';
import type { Issue, IssueContext } from '@resourcepackbuilder/utils';

export interface RecipeIssues {
  /** Issues of the whole recipe */
  recipe: Issue[];
  /** Issues of the input of cooking and stonecutting recipes */
  input: Issue[];
  /** Issues of each ingredient, by its letter */
  ingredients: Map<string, Issue[]>;
}

const RECIPE_CODES: readonly string[] = Object.values(RECIPE_FRAME_CODES);

/** Index of the frame naming the recipe with `key`, or -1. */
function recipeFrameIndex(context: IssueContext[] | undefined, key: string): number {
  return context?.findIndex((frame) => RECIPE_CODES.includes(frame.code) && frame.args?.recipe === key) ?? -1;
}

/**
 * The issues of the recipe with `key` among `issues` (e.g. the item's issues of the export plan, see
 * validateRecipes), sorted to where the recipe card shows them. The frames up to the recipe's own frame
 * ("Item X, recipe Y, ingredient A") are dropped there because the place already says it; issues of letters
 * without an ingredient (not in `ingredientLetters`) stay with the recipe and keep the recipe's frame.
 */
export function recipeIssues(issues: Issue[], key: string, ingredientLetters: readonly string[]): RecipeIssues {
  const sorted: RecipeIssues = { recipe: [], input: [], ingredients: new Map() };
  for (const issue of issues) {
    const index = recipeFrameIndex(issue.context, key);
    if (index < 0) continue;
    const frame = issue.context![index];
    const local: Issue = { ...issue, context: undefined };
    const letter = frame.code === RECIPE_FRAME_CODES.ingredient ? frame.args?.letter : undefined;
    if (typeof letter === 'string' && ingredientLetters.includes(letter)) {
      sorted.ingredients.set(letter, [...(sorted.ingredients.get(letter) ?? []), local]);
    } else if (frame.code === RECIPE_FRAME_CODES.input) {
      sorted.input.push(local);
    } else if (frame.code === RECIPE_FRAME_CODES.recipe) {
      sorted.recipe.push(local);
    } else {
      sorted.recipe.push({ ...issue, context: issue.context!.slice(index) });
    }
  }
  return sorted;
}
