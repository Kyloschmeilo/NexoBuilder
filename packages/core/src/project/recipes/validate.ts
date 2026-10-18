/**
 * Checks of the project's recipes before export, for the project's target: recipe types and ingredient sources the
 * target's plugin does not read, missing and malformed ingredients, the source ingredient of transform recipes and
 * the trim pattern of trim recipes.
 */
import { itemFrame, itemTarget, recipeFrame, recipeIngredientFrame, recipeInputFrame, recipeSlotFrame } from '../issueFrames';
import { inContext, isPlainObject, issueReporter, type Issue, type IssueContext, type ReportIssue } from '@resourcepackbuilder/utils';
import { RESOURCE_LOCATION_PATTERN } from '@resourcepackbuilder/minecraft';
import type { Item, Project } from '../types';
import type { PackTargetId } from '../target';
import { recipeKeys } from './export';
import { MATERIAL_PATTERN } from '../item';
import {
  getRecipeTypeInfo,
  type IngredientRef,
  INGREDIENT_LETTERS,
  isIngredientSourceAvailable,
  isRecipeTypeAvailable,
  isSlotOptional,
  MAX_INGREDIENT_AMOUNT,
  MAX_RESULT_AMOUNT,
  type Recipe,
  type RecipeIngredient,
  recipeSlot,
} from './model';

/** The plugin names of the targets, as the messages show them. */
const TARGET_NAMES: Record<PackTargetId, string> = { nexo: 'Nexo', craftengine: 'CraftEngine' };

/** The key each target reads a trim recipe's pattern from. */
export const TRIM_PATTERN_KEYS: Record<PackTargetId, string> = { nexo: 'trim_pattern', craftengine: 'pattern' };

/** An id another plugin's item is referenced by in CraftEngine: `namespace:id`. */
const NAMESPACED_ID = /^[a-z0-9_.-]+:[a-z0-9_./-]+$/;

/** Checks an item or tag reference; false when it has no id (the caller decides whether that is an error). */
function validateRef(ref: IngredientRef, project: Project, add: ReportIssue): boolean {
  const id = ref.id.trim();
  if (!id) return false;
  if (!isIngredientSourceAvailable(ref.source, project.target)) {
    add('error', 'recipe.sourceUnsupported', { target: TARGET_NAMES[project.target], id });
    return true;
  }
  if (ref.source === 'minecraft' && !MATERIAL_PATTERN.test(id.toUpperCase())) add('error', 'recipe.materialInvalid', { id });
  if (ref.source === 'tag' && !RESOURCE_LOCATION_PATTERN.test(id)) add('error', 'recipe.tagInvalid', { id });
  if (ref.source === 'external' && !NAMESPACED_ID.test(id)) add('error', 'recipe.externalIdInvalid', { id });
  if (ref.source === 'mmoitems' && !ref.itemType?.trim()) add('error', 'recipe.mmoitemsTypeMissing', { id });
  // A missing item is fine for Nexo (another plugin may add it); CraftEngine skips a recipe whose item it lacks
  if (ref.source === 'nexo' && !Object.values(project.items).some((i) => i.itemId === id)) {
    if (project.target === 'craftengine') add('warning', 'recipe.ceItemNotInProject', { id });
    else add('info', 'recipe.nexoItemNotInProject', { id });
  }
  return true;
}

function validateIngredient(ingredient: RecipeIngredient | null | undefined, context: IssueContext, project: Project, issues: Issue[]) {
  const add = issueReporter(issues, { context: [context] });
  if (!ingredient || !validateRef(ingredient, project, add)) {
    add('error', 'recipe.ingredientMissing');
    return;
  }
  if (
    ingredient.amount !== undefined &&
    (!Number.isInteger(ingredient.amount) || ingredient.amount < 1 || ingredient.amount > MAX_INGREDIENT_AMOUNT)
  ) {
    add('error', 'recipe.amountRange');
  }
  // Only CraftEngine reads alternatives and only Nexo replacements; the other target's export leaves them out
  if (project.target === 'craftengine') {
    for (const alternative of ingredient.alternatives ?? []) {
      if (!validateRef(alternative, project, add)) add('error', 'recipe.alternativeMissing');
    }
  }
  if (project.target === 'nexo' && ingredient.replacement) validateRef(ingredient.replacement, project, add);
}

/** Whether an ingredient is marked as the source of a transform recipe. */
export const isSourceIngredient = (ingredient: RecipeIngredient | undefined): boolean =>
  isPlainObject(ingredient?.options) && ingredient.options.source === true;

/** The ingredients a crafting recipe uses: those of its grid (shaped) or all filled ones (shapeless). */
export function usedIngredients(recipe: Recipe): RecipeIngredient[] {
  const isShaped = getRecipeTypeInfo(recipe.type).kind === 'shaped';
  const used = new Set(recipe.grid.filter(Boolean));
  return INGREDIENT_LETTERS.filter((letter) => !isShaped || used.has(letter))
    .map((letter) => recipe.ingredients[letter])
    .filter((ingredient): ingredient is RecipeIngredient => Boolean(ingredient?.id.trim()));
}

/**
 * Checks one recipe; `key` is its unique key (see recipeKeys). Each issue carries one context frame:
 * `context.recipe`, `context.recipeIngredient`, `context.recipeInput` or `context.recipeSlot`.
 */
export function validateRecipe(recipe: Recipe, project: Project, key: string): Issue[] {
  const issues: Issue[] = [];
  const info = getRecipeTypeInfo(recipe.type);
  const add = issueReporter(issues, { context: [recipeFrame(key)] });
  if (!isRecipeTypeAvailable(recipe.type, project.target)) {
    add('warning', 'recipe.typeUnsupported', { target: TARGET_NAMES[project.target], type: recipe.type });
    return issues;
  }
  const ingredientContext = (letter: string) => recipeIngredientFrame(key, letter);
  if (info.hasResult && (!Number.isInteger(recipe.resultAmount) || recipe.resultAmount < 1 || recipe.resultAmount > MAX_RESULT_AMOUNT)) {
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
  }
  for (const slot of info.slots) {
    const ingredient = recipeSlot(recipe, slot);
    if (!ingredient?.id.trim() && isSlotOptional(recipe.type, slot, project.target)) continue;
    validateIngredient(ingredient, slot === 'input' ? recipeInputFrame(key) : recipeSlotFrame(key, slot), project, issues);
  }
  if (info.kind === 'cooking') {
    if (!Number.isFinite(recipe.cookingTime) || recipe.cookingTime < 1) add('error', 'recipe.cookingTimeInvalid');
    if (!Number.isFinite(recipe.experience) || recipe.experience < 0) add('error', 'recipe.experienceNegative');
  }
  if (info.hasSource) {
    const sources = usedIngredients(recipe).filter(isSourceIngredient).length;
    if (sources === 0) add('error', 'recipe.sourceMissing');
    if (sources > 1) add('error', 'recipe.sourceMultiple');
  }
  if (recipe.type === 'smithing_trim') {
    const pattern = recipe.options?.[TRIM_PATTERN_KEYS[project.target]];
    // Nexo skips a trim recipe without a pattern; CraftEngine needs one from Minecraft 1.21.5 on
    if (typeof pattern !== 'string' || !pattern.trim()) add(project.target === 'nexo' ? 'error' : 'warning', 'recipe.trimPatternMissing');
  }
  return issues;
}

/** Checks the recipes of all `items`; each issue targets its item and carries its `context.item` frame first. */
export function validateRecipes(project: Project, items: Item[]): Issue[] {
  return items.flatMap((item) => {
    const keys = recipeKeys(item);
    return (item.recipes ?? []).flatMap((recipe) =>
      validateRecipe(recipe, project, keys.get(recipe.id) ?? recipe.type).map((issue) =>
        inContext(issue, [itemFrame(item)], itemTarget(item)),
      ),
    );
  });
}
