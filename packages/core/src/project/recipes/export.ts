/** The parts of the recipe export every target shares: the recipes' unique keys and the trimmed shaped grid. */
import type { Item } from '../types';
import type { Recipe, RecipeType } from './model';

/** The item's recipes with their unique keys, e.g. "ruby_sword_shaped" or "ruby_sword_shaped_2". */
export function keyedRecipes(item: Item): Array<{ key: string; recipe: Recipe }> {
  const counter = new Map<RecipeType, number>();
  return (item.recipes ?? []).map((recipe) => {
    const n = (counter.get(recipe.type) ?? 0) + 1;
    counter.set(recipe.type, n);
    return { key: `${item.itemId}_${recipe.type}${n > 1 ? `_${n}` : ''}`, recipe };
  });
}

/** Recipe ID → unique key of the recipe in the YAML */
export function recipeKeys(item: Item): Map<string, string> {
  return new Map(keyedRecipes(item).map(({ key, recipe }) => [recipe.id, key]));
}

/** The rows of a shaped grid without empty border rows and columns, so the recipe works at any position in the grid. */
export function trimShape(grid: string[]): string[] {
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
