/**
 * The recipe model both targets share: the recipe types (each read by Nexo, CraftEngine or both), their ingredient
 * slots, the ingredient sources and the recipe's own fields. Nexo writes a recipe to plugins/Nexo/recipes/<folder>/…
 * (nexo/recipes/files.ts), CraftEngine under `recipes:` of the item's file (craftEngine/recipes.ts). Keys only one
 * target reads (group, permission, transform processors …) live in `options` and `RecipeIngredient.options` under
 * their YAML name; each target lists the keys it reads per type (nexo/recipes/options.ts, craftEngine/recipeOptions.ts).
 */
import { keySegment } from '@resourcepackbuilder/utils';
import type { PackTargetId } from '../target';
import type { ConfigObject } from '../types';

/** Highest amount per slot Nexo accepts for an ingredient. */
export const MAX_INGREDIENT_AMOUNT = 64;
/** Highest number of items a recipe can produce. */
export const MAX_RESULT_AMOUNT = 99;

export type RecipeType =
  | 'shaped'
  | 'shapeless'
  | 'furnace'
  | 'blasting'
  | 'smoking'
  | 'campfire'
  | 'stonecutting'
  | 'crafter'
  | 'shaped_transform'
  | 'shapeless_transform'
  | 'brewing'
  | 'smithing_transform'
  | 'smithing_trim'
  | 'transmute'
  | 'anvil'
  | 'dye';

/**
 * Where an ingredient comes from: a vanilla item, an item of the project (`nexo`, the name the stored data keeps), an
 * item tag, an item of another plugin or pack under its namespaced id (CraftEngine), a MythicCrucible item or an
 * MMOItems item (Nexo).
 */
export type IngredientSource = 'minecraft' | 'nexo' | 'tag' | 'external' | 'crucible' | 'mmoitems';

/** An item or tag by its source, without the predicates of a full ingredient (an alternative, a replacement). */
export interface IngredientRef {
  source: IngredientSource;
  id: string;
  /** MMOItems: the item type (SWORD, MATERIAL …); the id is the item's id within it */
  itemType?: string;
}

export interface RecipeIngredient extends IngredientRef {
  /** Required amount per slot (Nexo amount predicate, CraftEngine `count`) */
  amount?: number;
  /** CraftEngine: further items or tags the slot accepts as well */
  alternatives?: IngredientRef[];
  /** Nexo: the item left in the grid after crafting (replacement predicate) */
  replacement?: IngredientRef;
  /** Further keys of the ingredient by their YAML name (Nexo `damage`/`preserve`, CraftEngine `predicate`/`source`) */
  options?: ConfigObject;
}

/** The single-ingredient slots of the recipe types without a crafting grid. */
export type RecipeSlot = 'input' | 'reagent' | 'template' | 'base' | 'addition' | 'material' | 'dye';

/** The slots besides `input`, kept in `Recipe.slots`. */
export type ExtraRecipeSlot = Exclude<RecipeSlot, 'input'>;

/** Every slot name, in display order. */
export const RECIPE_SLOTS: readonly RecipeSlot[] = ['input', 'reagent', 'template', 'base', 'addition', 'material', 'dye'];

export interface Recipe {
  id: string;
  type: RecipeType;
  /** Number of produced items */
  resultAmount: number;
  /** shaped: 9 cells (row by row), each a letter from `ingredients` or '' */
  grid: string[];
  /** shaped/shapeless: letter → ingredient */
  ingredients: Record<string, RecipeIngredient>;
  /** The main single ingredient: furnace and stonecutter input, brewing bottle, transmute/anvil input, dye target */
  input: RecipeIngredient | null;
  /** Furnaces: duration in ticks */
  cookingTime: number;
  experience: number;
  /** The other slots of the types that have them (brewing reagent, smithing template/base/addition …) */
  slots?: Partial<Record<ExtraRecipeSlot, RecipeIngredient>>;
  /** Further keys of the recipe by their YAML name (group, category, permission, transform processors …) */
  options?: ConfigObject;
}

/** How a recipe type is edited: a crafting grid, a free list of ingredients, or single slots (furnaces with a time). */
export type RecipeKind = 'shaped' | 'shapeless' | 'cooking' | 'slots';

export interface RecipeTypeInfo {
  type: RecipeType;
  /** Message key in the `schema` namespace */
  label: string;
  /** Message key in the `schema` namespace */
  description: string;
  kind: RecipeKind;
  /** The targets whose plugin reads the type */
  targets: readonly PackTargetId[];
  /** The single-ingredient slots, in display order (none for the crafting kinds) */
  slots: readonly RecipeSlot[];
  /** Slots a target may leave empty (CraftEngine's smithing template and addition) */
  optionalSlots?: Partial<Record<PackTargetId, readonly RecipeSlot[]>>;
  /** The recipe produces the item (false: it changes the item put in, like a trim) */
  hasResult: boolean;
  /** One ingredient is marked as the source whose data the result keeps (CraftEngine's transform recipes) */
  hasSource?: boolean;
  /** First Minecraft version whose server reads the type (CraftEngine registers dye recipes from 26.1 on) */
  minVersion?: string;
  defaultCookingTime?: number;
}

const BOTH: readonly PackTargetId[] = ['nexo', 'craftengine'];
const NEXO: readonly PackTargetId[] = ['nexo'];
const CRAFT_ENGINE: readonly PackTargetId[] = ['craftengine'];
const SMITHING_SLOTS: readonly RecipeSlot[] = ['template', 'base', 'addition'];

/** A recipe type whose messages live at `recipes.types.<camel(type)>` */
const recipeType = (
  type: RecipeType,
  kind: RecipeKind,
  targets: readonly PackTargetId[],
  rest: Partial<Omit<RecipeTypeInfo, 'type' | 'label' | 'description' | 'kind' | 'targets'>> = {},
): RecipeTypeInfo => ({
  type,
  label: `recipes.types.${keySegment(type)}.label`,
  description: `recipes.types.${keySegment(type)}.description`,
  kind,
  targets,
  slots: kind === 'cooking' ? ['input'] : [],
  hasResult: true,
  ...rest,
});

export const RECIPE_TYPES: RecipeTypeInfo[] = [
  recipeType('shaped', 'shaped', BOTH),
  recipeType('shapeless', 'shapeless', BOTH),
  recipeType('furnace', 'cooking', BOTH, { defaultCookingTime: 200 }),
  recipeType('blasting', 'cooking', BOTH, { defaultCookingTime: 100 }),
  recipeType('smoking', 'cooking', BOTH, { defaultCookingTime: 100 }),
  recipeType('campfire', 'cooking', BOTH, { defaultCookingTime: 600 }),
  recipeType('stonecutting', 'slots', BOTH, { slots: ['input'] }),
  recipeType('crafter', 'shaped', NEXO),
  recipeType('shaped_transform', 'shaped', CRAFT_ENGINE, { hasSource: true }),
  recipeType('shapeless_transform', 'shapeless', CRAFT_ENGINE, { hasSource: true }),
  recipeType('brewing', 'slots', BOTH, { slots: ['input', 'reagent'] }),
  recipeType('smithing_transform', 'slots', BOTH, { slots: SMITHING_SLOTS, optionalSlots: { craftengine: ['template', 'addition'] } }),
  recipeType('smithing_trim', 'slots', BOTH, { slots: SMITHING_SLOTS, hasResult: false }),
  recipeType('transmute', 'slots', NEXO, { slots: ['input', 'material'] }),
  recipeType('anvil', 'slots', NEXO, { slots: ['input', 'material'] }),
  recipeType('dye', 'slots', CRAFT_ENGINE, { slots: ['input', 'dye'], minVersion: '26.1' }),
];

export function getRecipeTypeInfo(type: RecipeType): RecipeTypeInfo {
  return RECIPE_TYPES.find((t) => t.type === type) ?? RECIPE_TYPES[0];
}

/** Whether the target's plugin reads recipes of the type. */
export function isRecipeTypeAvailable(type: RecipeType, target: PackTargetId): boolean {
  return getRecipeTypeInfo(type).targets.includes(target);
}

/** The recipe types the target's plugin reads, in display order. */
export function recipeTypesFor(target: PackTargetId): RecipeTypeInfo[] {
  return RECIPE_TYPES.filter((info) => info.targets.includes(target));
}

/** Message key of a slot's name in the `schema` namespace. */
export const recipeSlotLabel = (slot: RecipeSlot): string => `recipes.slots.${slot}.label`;
/** Message key of a slot's help text in the `schema` namespace. */
export const recipeSlotHelp = (slot: RecipeSlot): string => `recipes.slots.${slot}.help`;

/** Whether the target lets the type's slot stay empty. */
export function isSlotOptional(type: RecipeType, slot: RecipeSlot, target: PackTargetId): boolean {
  return getRecipeTypeInfo(type).optionalSlots?.[target]?.includes(slot) ?? false;
}

/** The ingredient in a slot of the recipe (`input` or one of `slots`). */
export function recipeSlot(recipe: Recipe, slot: RecipeSlot): RecipeIngredient | null {
  return slot === 'input' ? recipe.input : (recipe.slots?.[slot] ?? null);
}

export interface IngredientSourceInfo {
  value: IngredientSource;
  /** Message key in the `schema` namespace */
  label: string;
  /** The targets whose plugin reads ingredients of the source */
  targets: readonly PackTargetId[];
}

/** `label` is a message key in the `schema` namespace. */
export const INGREDIENT_SOURCES: IngredientSourceInfo[] = (
  [
    ['minecraft', BOTH],
    ['nexo', BOTH],
    ['tag', BOTH],
    ['external', CRAFT_ENGINE],
    ['crucible', NEXO],
    ['mmoitems', NEXO],
  ] as const
).map(([value, targets]) => ({ value, label: `recipes.sources.${value}`, targets }));

/** Whether the target's plugin reads ingredients of the source. */
export function isIngredientSourceAvailable(source: IngredientSource, target: PackTargetId): boolean {
  return INGREDIENT_SOURCES.find((info) => info.value === source)?.targets.includes(target) ?? false;
}

/** The ingredient sources the target's plugin reads, in display order. */
export function ingredientSourcesFor(target: PackTargetId): IngredientSourceInfo[] {
  return INGREDIENT_SOURCES.filter((info) => info.targets.includes(target));
}

export const INGREDIENT_LETTERS = 'ABCDEFGHI'.split('');

/** An ingredient the user has yet to fill in. */
export function emptyIngredient(): RecipeIngredient {
  return { source: 'minecraft', id: '' };
}

export function createRecipe(type: RecipeType, id: string): Recipe {
  const info = getRecipeTypeInfo(type);
  const isCrafting = info.kind === 'shaped' || info.kind === 'shapeless';
  const extraSlots = info.slots.filter((slot): slot is ExtraRecipeSlot => slot !== 'input');
  return {
    id,
    type,
    resultAmount: 1,
    grid: Array(9).fill(''),
    ingredients: isCrafting ? { A: emptyIngredient() } : {},
    input: info.slots.includes('input') ? emptyIngredient() : null,
    cookingTime: info.defaultCookingTime ?? 200,
    experience: 0.1,
    ...(extraSlots.length > 0 && { slots: Object.fromEntries(extraSlots.map((slot) => [slot, emptyIngredient()])) }),
  };
}
