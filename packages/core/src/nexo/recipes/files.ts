/** Export of recipes: one file per recipe type under recipes/<type>/. */
import { groupBy } from '@resourcepackbuilder/utils';
import type { Item, Project } from '../../project/types';
import { englishName } from '../fieldNames';
import { projectFileName } from '../projectFiles';
import { itemsToYaml } from '../yaml';
import { getRecipeTypeInfo, INGREDIENT_LETTERS, RECIPE_TYPES, type Recipe, type RecipeIngredient, type RecipeType } from './model';

function ingredientToYaml(ingredient: RecipeIngredient): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const id = ingredient.id.trim();
  if (ingredient.source === 'minecraft') out.minecraft_type = id.toUpperCase();
  else if (ingredient.source === 'nexo') out.nexo_item = id;
  else out.tag = id;
  if (ingredient.amount && ingredient.amount > 1) out.amount = ingredient.amount;
  return out;
}

/** Removes empty border rows/columns so the recipe works at any position in the grid. */
function trimShape(grid: string[]): string[] {
  const rows = [0, 1, 2].map((r) => [0, 1, 2].map((c) => grid[r * 3 + c] || ' '));
  const usedRows = [0, 1, 2].filter((r) => rows[r].some((ch) => ch !== ' '));
  const usedCols = [0, 1, 2].filter((c) => rows.some((row) => row[c] !== ' '));
  if (usedRows.length === 0) return [];
  const r0 = usedRows[0];
  const r1 = usedRows[usedRows.length - 1];
  const c0 = usedCols[0];
  const c1 = usedCols[usedCols.length - 1];
  const result: string[] = [];
  for (let r = r0; r <= r1; r++) result.push(rows[r].slice(c0, c1 + 1).join(''));
  return result;
}

/** The YAML entry of one recipe (also the unit the recipe tests check). */
export function recipeToYaml(recipe: Recipe, item: Item): Record<string, unknown> {
  const result: Record<string, unknown> = { nexo_item: item.nexoId };
  if (recipe.resultAmount > 1) result.amount = recipe.resultAmount;
  const info = getRecipeTypeInfo(recipe.type);
  const out: Record<string, unknown> = { result };
  if (info.kind === 'shaped') {
    const shape = trimShape(recipe.grid);
    const used = new Set(recipe.grid.filter(Boolean));
    out.shape = shape;
    const ingredients: Record<string, unknown> = {};
    for (const letter of INGREDIENT_LETTERS) {
      const ingredient = recipe.ingredients[letter];
      if (ingredient && used.has(letter)) ingredients[letter] = ingredientToYaml(ingredient);
    }
    out.ingredients = ingredients;
  } else if (info.kind === 'shapeless') {
    const ingredients: Record<string, unknown> = {};
    for (const letter of INGREDIENT_LETTERS) {
      const ingredient = recipe.ingredients[letter];
      if (ingredient?.id.trim()) ingredients[letter] = ingredientToYaml(ingredient);
    }
    out.ingredients = ingredients;
  } else {
    if (recipe.input) out.input = ingredientToYaml(recipe.input);
    if (info.kind === 'cooking') {
      out.cookingTime = Math.round(recipe.cookingTime);
      out.experience = recipe.experience;
    }
  }
  return out;
}

/** The item's recipes with their unique keys, e.g. "ruby_sword_shaped" or "ruby_sword_shaped_2". */
function keyedRecipes(item: Item): Array<{ key: string; recipe: Recipe }> {
  const counter = new Map<RecipeType, number>();
  return (item.recipes ?? []).map((recipe) => {
    const n = (counter.get(recipe.type) ?? 0) + 1;
    counter.set(recipe.type, n);
    return { key: `${item.nexoId}_${recipe.type}${n > 1 ? `_${n}` : ''}`, recipe };
  });
}

/** Recipe ID → unique key of the recipe in the YAML */
export function recipeKeys(item: Item): Map<string, string> {
  return new Map(keyedRecipes(item).map(({ key, recipe }) => [recipe.id, key]));
}

export function recipeFilePath(project: Project, type: RecipeType): string {
  return `recipes/${type}/${projectFileName(project)}.yml`;
}

/** Generates all recipe files of the project (path → YAML). */
export function buildRecipeFiles(project: Project, items: Item[]): Map<string, string> {
  const keyed = items.flatMap((item) => keyedRecipes(item).map(({ key, recipe }) => ({ type: recipe.type, id: key, recipe, item })));
  const byType = groupBy(keyed, (entry) => entry.type);
  const files = new Map<string, string>();
  for (const info of RECIPE_TYPES) {
    const list = byType.get(info.type);
    if (!list?.length) continue;
    const entries = list.map(({ id, recipe, item }) => ({ id, config: recipeToYaml(recipe, item) }));
    files.set(recipeFilePath(project, info.type), itemsToYaml(entries, `${englishName(info.type)} recipes`));
  }
  return files;
}
