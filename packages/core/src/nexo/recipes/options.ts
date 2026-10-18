/**
 * The keys Nexo reads on a recipe and on its ingredients beyond the shared model, per recipe type (from the Nexo 1.30
 * recipe loaders and the docs at general-usage/recipes). `permission`, `group` and `category` are only in the jar's
 * loaders, so they are advanced fields whose help names the version. Messages live at `recipes.options.fields.*` of
 * the `schema` namespace.
 */
import { COMPONENT_NAMES } from '@resourcepackbuilder/minecraft';
import { field, resolveFields } from '../../form/build';
import { plainOptions } from '../../form/options';
import type { RecipeType } from '../../project/recipes/model';
import {
  RECIPE_COOKING_CATEGORIES,
  RECIPE_CRAFTING_CATEGORIES,
  type RecipeOption,
  type RecipeTargetOptions,
  VANILLA_TRIM_PATTERNS,
} from '../../project/recipes/options';
import { NEXO_DOCS, NEXO_RECIPE_DOCS } from '../form/schema/docs';

const SCOPE = 'recipes.options';
const DOCS = NEXO_DOCS.recipes;

const CRAFTING: RecipeType[] = ['shaped', 'shapeless', 'crafter'];
const COOKING: RecipeType[] = ['furnace', 'blasting', 'smoking', 'campfire'];

/** Data components as Nexo's `preserve` lists name them (`damage`, `enchantments`, without `minecraft:`). */
const PRESERVED_COMPONENTS = plainOptions(COMPONENT_NAMES.map((name) => name.replace(/^minecraft:/, '')));

/** One field resolved at its own message scope `recipes.options.fields.<name>`. */
function optionField(key: string, name: string, spec: Parameters<typeof resolveFields>[0][string]) {
  return resolveFields({ [key]: { scope: `${SCOPE}.fields.${name}`, ...spec } }, SCOPE)[0];
}

/** The keys Nexo reads on a recipe of each type. */
const RECIPE_OPTIONS: RecipeOption[] = [
  {
    field: optionField('permission', 'permission', field.text({ help: true, placeholder: true, advanced: true, docs: DOCS.page })),
    // Recipes a crafter block makes have no player whose permission could be checked
    types: ['shaped', 'shapeless', ...COOKING, 'stonecutting', 'brewing', 'smithing_transform', 'smithing_trim', 'transmute', 'anvil'],
  },
  {
    field: optionField('group', 'nexoGroup', field.text({ help: true, advanced: true, docs: DOCS.page })),
    types: [...CRAFTING, ...COOKING, 'stonecutting', 'transmute'],
  },
  {
    field: optionField(
      'category',
      'nexoCraftingCategory',
      field.select(RECIPE_CRAFTING_CATEGORIES, { help: true, advanced: true, docs: DOCS.page }),
    ),
    types: ['shaped', 'shapeless'],
  },
  {
    field: optionField(
      'category',
      'nexoCookingCategory',
      field.select(RECIPE_COOKING_CATEGORIES, { help: true, advanced: true, docs: DOCS.page }),
    ),
    types: COOKING,
  },
  {
    field: optionField('copy_components', 'copyComponents', field.boolean({ help: true, docs: NEXO_RECIPE_DOCS.smithing_transform })),
    types: ['smithing_transform'],
  },
  {
    field: optionField(
      'trim_pattern',
      'trimPattern',
      field.select(VANILLA_TRIM_PATTERNS, { allowCustom: true, help: true, placeholder: true, docs: NEXO_RECIPE_DOCS.smithing_trim }),
    ),
    types: ['smithing_trim'],
  },
  {
    field: optionField(
      'preserve',
      'recipePreserve',
      field.stringList({ suggestions: PRESERVED_COMPONENTS, help: true, docs: NEXO_RECIPE_DOCS.transmute }),
    ),
    types: ['transmute', 'anvil'],
  },
  {
    field: optionField('cost', 'anvilCost', field.number({ integer: true, min: 0, help: true, docs: DOCS.page })),
    types: ['anvil'],
  },
  {
    field: optionField('repair', 'anvilRepair', field.number({ integer: true, min: 1, help: true, docs: DOCS.page })),
    types: ['anvil'],
  },
];

/** The keys Nexo reads on an ingredient of each type (only crafting recipes consume ingredients this way). */
const INGREDIENT_OPTIONS: RecipeOption[] = [
  {
    field: optionField('damage', 'damage', field.number({ integer: true, min: 1, help: true, docs: DOCS.damage })),
    types: CRAFTING,
  },
  {
    field: optionField('preserve', 'preserve', field.stringList({ suggestions: PRESERVED_COMPONENTS, help: true, docs: DOCS.preserve })),
    types: CRAFTING,
  },
];

/** Nexo's recipe and ingredient keys beyond the shared model. */
export const NEXO_RECIPE_OPTIONS: RecipeTargetOptions = { recipe: RECIPE_OPTIONS, ingredient: INGREDIENT_OPTIONS };

/** The recipe types whose ingredients Nexo reads a replacement for (the replacement predicate). */
export const NEXO_REPLACEMENT_TYPES: readonly RecipeType[] = CRAFTING;

/** The project's disabled vanilla recipes (recipes/disabled_recipes.yml) as the editor edits them. */
export const NEXO_DISABLED_RECIPES_FIELD = resolveFields(
  { disabled_recipes: field.stringList({ help: true, placeholder: true, docs: DOCS.disabled }) },
  SCOPE,
)[0];
