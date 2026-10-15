/**
 * Crafting recipes for Nexo (plugins/Nexo/recipes/<type>/…yml).
 * Format per the Nexo docs (general-usage/recipes): each recipe type has its own folder,
 * the folder name is the type in lowercase (shaped, shapeless, furnace, …).
 */
import type { Issue, Item, Project } from '../types';
import { slugify } from '../util';
import { itemsToYaml } from './yaml';

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
  label: string;
  description: string;
  kind: 'shaped' | 'shapeless' | 'cooking' | 'stonecutting';
  defaultCookingTime?: number;
}

export const RECIPE_TYPES: RecipeTypeInfo[] = [
  { type: 'shaped', label: 'Shaped', description: 'Werkbank: Zutaten müssen in einem bestimmten Muster liegen.', kind: 'shaped' },
  { type: 'shapeless', label: 'Shapeless', description: 'Werkbank: Zutaten können beliebig im Raster liegen.', kind: 'shapeless' },
  { type: 'furnace', label: 'Furnace', description: 'Schmelzen im normalen Ofen.', kind: 'cooking', defaultCookingTime: 200 },
  { type: 'blasting', label: 'Blasting', description: 'Schmelzen im Schmelzofen.', kind: 'cooking', defaultCookingTime: 100 },
  { type: 'smoking', label: 'Smoking', description: 'Garen im Räucherofen.', kind: 'cooking', defaultCookingTime: 100 },
  { type: 'campfire', label: 'Campfire', description: 'Garen auf dem Lagerfeuer.', kind: 'cooking', defaultCookingTime: 600 },
  { type: 'stonecutting', label: 'Stonecutting', description: 'Eine Zutat wird in der Steinsäge verarbeitet.', kind: 'stonecutting' },
];

export function getRecipeTypeInfo(type: RecipeType): RecipeTypeInfo {
  return RECIPE_TYPES.find((t) => t.type === type) ?? RECIPE_TYPES[0];
}

export const INGREDIENT_SOURCES: Array<{ value: IngredientSource; label: string }> = [
  { value: 'minecraft', label: 'Minecraft-Item' },
  { value: 'nexo', label: 'Nexo-Item' },
  { value: 'tag', label: 'Item-Tag' },
];

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

/* ====================================================================== YAML */

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

/** Unique key of the recipe, e.g. "rubin_schwert_shaped" or "rubin_schwert_shaped_2". */
export function recipeKeys(item: Item): Map<string, string> {
  const keys = new Map<string, string>();
  const counter = new Map<RecipeType, number>();
  for (const recipe of item.recipes ?? []) {
    const n = (counter.get(recipe.type) ?? 0) + 1;
    counter.set(recipe.type, n);
    keys.set(recipe.id, `${item.nexoId}_${recipe.type}${n > 1 ? `_${n}` : ''}`);
  }
  return keys;
}

export function recipeFilePath(project: Project, type: RecipeType): string {
  return `recipes/${type}/${slugify(project.name, 'resourcepackbuilder')}.yml`;
}

/* ====================================================================== Validation */

const MATERIAL_PATTERN = /^[A-Za-z0-9_]+$/;
const TAG_PATTERN = /^([a-z0-9_.-]+:)?[a-z0-9_./-]+$/;

function validateIngredient(ingredient: RecipeIngredient | null | undefined, label: string, project: Project, issues: Issue[]) {
  const id = ingredient?.id.trim() ?? '';
  if (!ingredient || !id) {
    issues.push({ level: 'error', message: `${label}: Es ist keine Zutat angegeben.` });
    return;
  }
  if (ingredient.source === 'minecraft' && !MATERIAL_PATTERN.test(id)) {
    issues.push({ level: 'error', message: `${label}: „${id}“ ist kein gültiger Minecraft-Item-Name (z.B. DIAMOND).` });
  }
  if (ingredient.source === 'tag' && !TAG_PATTERN.test(id)) {
    issues.push({ level: 'error', message: `${label}: „${id}“ ist kein gültiger Tag (z.B. planks).` });
  }
  if (ingredient.source === 'nexo' && !Object.values(project.items).some((i) => i.nexoId === id)) {
    issues.push({
      level: 'info',
      message: `${label}: Das Nexo-Item „${id}“ ist nicht in diesem Projekt – es muss auf dem Server existieren.`,
    });
  }
  if (ingredient.amount !== undefined && (!Number.isInteger(ingredient.amount) || ingredient.amount < 1 || ingredient.amount > 64)) {
    issues.push({ level: 'error', message: `${label}: Die Anzahl muss zwischen 1 und 64 liegen.` });
  }
}

export function validateRecipe(recipe: Recipe, project: Project, key: string): Issue[] {
  const issues: Issue[] = [];
  const info = getRecipeTypeInfo(recipe.type);
  const prefix = `Rezept „${key}“`;
  if (!Number.isInteger(recipe.resultAmount) || recipe.resultAmount < 1 || recipe.resultAmount > 99) {
    issues.push({ level: 'error', message: `${prefix}: Die Ergebnis-Anzahl muss zwischen 1 und 99 liegen.` });
  }
  if (info.kind === 'shaped') {
    const used = [...new Set(recipe.grid.filter(Boolean))];
    if (used.length === 0) issues.push({ level: 'error', message: `${prefix}: Im Raster liegt noch keine Zutat.` });
    for (const letter of used) validateIngredient(recipe.ingredients[letter], `${prefix}, Zutat ${letter}`, project, issues);
  } else if (info.kind === 'shapeless') {
    const filled = Object.entries(recipe.ingredients).filter(([, i]) => i.id.trim());
    if (filled.length === 0) issues.push({ level: 'error', message: `${prefix}: Es ist keine Zutat angegeben.` });
    for (const [letter, ingredient] of Object.entries(recipe.ingredients)) {
      validateIngredient(ingredient, `${prefix}, Zutat ${letter}`, project, issues);
    }
  } else {
    validateIngredient(recipe.input, `${prefix}, Eingabe`, project, issues);
    if (info.kind === 'cooking') {
      if (!Number.isFinite(recipe.cookingTime) || recipe.cookingTime < 1) {
        issues.push({ level: 'error', message: `${prefix}: Die Garzeit muss mindestens 1 Tick betragen.` });
      }
      if (!Number.isFinite(recipe.experience) || recipe.experience < 0) {
        issues.push({ level: 'error', message: `${prefix}: Die Erfahrung darf nicht negativ sein.` });
      }
    }
  }
  return issues;
}

/** Generates all recipe files of the project (path → YAML). */
export function buildRecipeFiles(project: Project, items: Item[]): Map<string, string> {
  const byType = new Map<RecipeType, Array<{ id: string; config: Record<string, unknown> }>>();
  for (const item of items) {
    const keys = recipeKeys(item);
    for (const recipe of item.recipes ?? []) {
      const list = byType.get(recipe.type) ?? [];
      list.push({ id: keys.get(recipe.id)!, config: recipeToYaml(recipe, item) });
      byType.set(recipe.type, list);
    }
  }
  const files = new Map<string, string>();
  for (const info of RECIPE_TYPES) {
    const list = byType.get(info.type);
    if (!list?.length) continue;
    files.set(recipeFilePath(project, info.type), itemsToYaml(list, `# Erstellt mit ResourcepackBuilder – ${info.label}-Rezepte`));
  }
  return files;
}
