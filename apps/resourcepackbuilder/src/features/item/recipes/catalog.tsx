/**
 * The "Add recipe" catalog: every recipe type the project's target reads, sorted into crafting, cooking, smithing and
 * the other stations, each with its icon, description, docs link and where it is written (CraftEngine's `type:`, Nexo's
 * recipe file).
 */
import type { ReactNode } from 'react';
import { Anvil, CookingPot, Flame, FlaskConical, Grid3x3, Hammer, Palette, Repeat, Shirt, Shuffle, Slice } from 'lucide-react';
import { type PackTargetId, type RecipeType, recipeTypesFor } from '@resourcepackbuilder/core/project';
import { recipeDocsFor } from '@resourcepackbuilder/core/targets';
import type { CatalogData, CatalogItem } from '../../../components/catalog';

/** The catalog categories of recipe types, in display order. */
export const RECIPE_CATEGORIES = ['crafting', 'cooking', 'smithing', 'stations'] as const;
export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

/** The category of each recipe type. */
const CATEGORY_OF: Record<RecipeType, RecipeCategory> = {
  shaped: 'crafting',
  shapeless: 'crafting',
  crafter: 'crafting',
  shaped_transform: 'crafting',
  shapeless_transform: 'crafting',
  transmute: 'crafting',
  dye: 'crafting',
  furnace: 'cooking',
  blasting: 'cooking',
  smoking: 'cooking',
  campfire: 'cooking',
  smithing_transform: 'smithing',
  smithing_trim: 'smithing',
  stonecutting: 'stations',
  brewing: 'stations',
  anvil: 'stations',
};

/** The types most items use, listed first and under "Common". */
const COMMON: readonly RecipeType[] = ['shaped', 'shapeless', 'furnace'];

/** The icon of each recipe type, shown on its catalog card and in the recipe row. */
export const RECIPE_TYPE_ICONS: Record<RecipeType, ReactNode> = {
  shaped: <Grid3x3 />,
  shapeless: <Shuffle />,
  crafter: <Grid3x3 />,
  shaped_transform: <Grid3x3 />,
  shapeless_transform: <Shuffle />,
  transmute: <Repeat />,
  dye: <Palette />,
  furnace: <Flame />,
  blasting: <Flame />,
  smoking: <CookingPot />,
  campfire: <Flame />,
  smithing_transform: <Hammer />,
  smithing_trim: <Shirt />,
  stonecutting: <Slice />,
  brewing: <FlaskConical />,
  anvil: <Anvil />,
};

/** The translated texts the catalog needs. */
export interface RecipeCatalogText {
  /** A message key of the `schema` namespace (type labels and descriptions). */
  schema: (key: string) => string;
  category: (category: RecipeCategory) => string;
  /** The detail pane's note on the file a recipe of the type is written to. */
  writtenTo?: (type: RecipeType) => string | undefined;
}

/** The recipe types of the target as catalog entries and categories (only the categories that have entries). */
export function recipeCatalog(target: PackTargetId, text: RecipeCatalogText): CatalogData {
  const items = recipeTypesFor(target).map((info): CatalogItem => ({
    id: info.type,
    label: text.schema(info.label),
    description: text.schema(info.description),
    yamlKey: info.type,
    category: CATEGORY_OF[info.type],
    common: COMMON.includes(info.type),
    icon: RECIPE_TYPE_ICONS[info.type],
    docs: { url: recipeDocsFor(target, info.type), target },
    // CraftEngine names the type in the recipe; Nexo files recipes by type instead (the note says where)
    preview: target === 'craftengine' ? `type: ${info.type}` : undefined,
    note: text.writtenTo?.(info.type),
  }));
  const used = new Set(items.map((item) => item.category));
  const categories = RECIPE_CATEGORIES.filter((id) => used.has(id)).map((id) => ({ id, label: text.category(id) }));
  return { items, categories };
}
