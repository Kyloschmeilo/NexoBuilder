import { recipeFrame, recipeIngredientFrame, recipeInputFrame } from '../../issueFrames';
import { issueReporter, type Issue, type IssueContext } from '../../issues';
import { RESOURCE_LOCATION_PATTERN } from '../../minecraft/resourceLocation';
import type { Project } from '../../project/types';
import { MATERIAL_PATTERN } from '../material';
import { getRecipeTypeInfo, MAX_INGREDIENT_AMOUNT, MAX_RESULT_AMOUNT, type Recipe, type RecipeIngredient } from './model';

function validateIngredient(ingredient: RecipeIngredient | null | undefined, context: IssueContext, project: Project, issues: Issue[]) {
  const add = issueReporter(issues, { context: [context] });
  const id = ingredient?.id.trim() ?? '';
  if (!ingredient || !id) {
    add('error', 'recipe.ingredientMissing');
    return;
  }
  if (ingredient.source === 'minecraft' && !MATERIAL_PATTERN.test(id.toUpperCase())) add('error', 'recipe.materialInvalid', { id });
  if (ingredient.source === 'tag' && !RESOURCE_LOCATION_PATTERN.test(id)) add('error', 'recipe.tagInvalid', { id });
  if (ingredient.source === 'nexo' && !Object.values(project.items).some((i) => i.nexoId === id)) {
    add('info', 'recipe.nexoItemNotInProject', { id });
  }
  if (
    ingredient.amount !== undefined &&
    (!Number.isInteger(ingredient.amount) || ingredient.amount < 1 || ingredient.amount > MAX_INGREDIENT_AMOUNT)
  ) {
    add('error', 'recipe.amountRange');
  }
}

/**
 * Checks one recipe; `key` is its unique key (see recipeKeys). Each issue carries one context frame:
 * `context.recipe`, `context.recipeIngredient` or `context.recipeInput`.
 */
export function validateRecipe(recipe: Recipe, project: Project, key: string): Issue[] {
  const issues: Issue[] = [];
  const info = getRecipeTypeInfo(recipe.type);
  const add = issueReporter(issues, { context: [recipeFrame(key)] });
  const ingredientContext = (letter: string) => recipeIngredientFrame(key, letter);
  if (!Number.isInteger(recipe.resultAmount) || recipe.resultAmount < 1 || recipe.resultAmount > MAX_RESULT_AMOUNT) {
    add('error', 'recipe.resultAmountRange');
  }
  if (info.kind === 'shaped') {
    const used = [...new Set(recipe.grid.filter(Boolean))];
    if (used.length === 0) add('error', 'recipe.gridEmpty');
    for (const letter of used) validateIngredient(recipe.ingredients[letter], ingredientContext(letter), project, issues);
  } else if (info.kind === 'shapeless') {
    const filled = Object.entries(recipe.ingredients).filter(([, i]) => i.id.trim());
    if (filled.length === 0) add('error', 'recipe.ingredientMissing');
    for (const [letter, ingredient] of Object.entries(recipe.ingredients)) {
      validateIngredient(ingredient, ingredientContext(letter), project, issues);
    }
  } else {
    validateIngredient(recipe.input, recipeInputFrame(key), project, issues);
    if (info.kind === 'cooking') {
      if (!Number.isFinite(recipe.cookingTime) || recipe.cookingTime < 1) add('error', 'recipe.cookingTimeInvalid');
      if (!Number.isFinite(recipe.experience) || recipe.experience < 0) add('error', 'recipe.experienceNegative');
    }
  }
  return issues;
}
