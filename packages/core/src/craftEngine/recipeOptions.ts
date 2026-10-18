/**
 * The keys CraftEngine reads on a recipe and on its ingredients beyond the shared model, per recipe type (from the
 * 26.9 recipe serializers and the wiki's recipe page): the recipe book `category` and `group`, the unlock switches,
 * the source-item merge of transform recipes with their transform processors, the result's post processors, the trim
 * pattern, and the Premium keys (`conditions`, `functions`, `visual_result`). Ingredients get `predicate` and, in
 * transform recipes, the `source` flag. Messages live at `recipes.options.*` and `recipes.processors.*` of the
 * shared `schema` namespace, apart from the condition and function catalogs, whose types are in `ceSchema`.
 */
import { keySegment } from '@resourcepackbuilder/utils';
import { field, type FieldSpecs, resolveFields } from '../form/build';
import type { TypedType } from '../form/fields';
import { RECIPE_TYPES, type RecipeType } from '../project/recipes/model';
import {
  RECIPE_COOKING_CATEGORIES,
  RECIPE_CRAFTING_CATEGORIES,
  type RecipeOption,
  type RecipeTargetOptions,
  VANILLA_TRIM_PATTERNS,
} from '../project/recipes/options';
import { CE_COMPONENTS, CE_ENCHANTMENTS } from './form/options';
import { CE_DOCS, CE_RECIPE_DOCS } from './form/schema/docs';
import { conditionList, functionList } from './logic/shared';

const SCOPE = 'recipes.options';
const PAGE = CE_DOCS.recipes;

/** The recipe types CraftEngine reads */
const ALL = RECIPE_TYPES.filter((info) => info.targets.includes('craftengine')).map((info) => info.type);
const CRAFTING: RecipeType[] = ['shaped', 'shapeless', 'shaped_transform', 'shapeless_transform', 'dye'];
const COOKING: RecipeType[] = ['furnace', 'blasting', 'smoking', 'campfire'];
const TRANSFORM: RecipeType[] = ['shaped_transform', 'shapeless_transform', 'smithing_transform'];
/** The types with a result (a trim changes the item put in) */
const WITH_RESULT = ALL.filter((type) => type !== 'smithing_trim');
/** The types the Premium conditions and functions apply to (the brewing serializer reads neither) */
const WITH_LOGIC = ALL.filter((type) => type !== 'brewing');

/** The types of a small catalog local to the recipes, messages at `recipes.<catalog>.<camel(type)>`. */
function recipeCatalog(catalog: string, specs: Record<string, FieldSpecs>, docs: string): TypedType[] {
  return Object.entries(specs).map(([type, fields]) => {
    const scope = `recipes.${catalog}.${keySegment(type)}`;
    const resolved = resolveFields(fields, scope).map((f) => ({ ...f, name: f.key }));
    return { type, label: `${scope}.label`, help: `${scope}.help`, fields: resolved, docs };
  });
}

/** Item data a processor applies: like an item's `data` section, edited as YAML. */
const itemData = () => field.yaml({ help: true, placeholder: true });

/** What a transform recipe keeps of its source item (ItemTransformDataProcessors). */
export const CE_TRANSFORM_PROCESSORS = recipeCatalog(
  'processors',
  {
    apply_data: { data: itemData() },
    merge_enchantments: {},
    keep_custom_data: { paths: field.stringList({ placeholder: true }) },
    keep_components: { components: field.stringList({ suggestions: CE_COMPONENTS }) },
    keep_tags: { tags: field.stringList({ placeholder: true }) },
  },
  `${PAGE}#transform-processors`,
);

/** What is applied to a recipe's result (PostProcessors). */
export const CE_RESULT_POST_PROCESSORS = recipeCatalog(
  'postProcessors',
  { apply_data: { data: itemData() } },
  `${PAGE}#result-post-processor`,
);

/** The checks an ingredient can require beyond its id (DataComponentPredicates). */
export const CE_INGREDIENT_PREDICATES = recipeCatalog(
  'predicates',
  {
    enchantment: { enchantments: field.map(field.number({ integer: true, min: 1 }), { keyOptions: CE_ENCHANTMENTS }) },
    exact: { component: field.select(CE_COMPONENTS, { allowCustom: true }), value: field.text({ placeholder: true }) },
  },
  `${PAGE}#predicate`,
);

const fields = resolveFields(
  {
    group: field.text({ help: true, docs: `${PAGE}#group--category` }),
    unlock_on_ingredient_obtained: field.boolean({ help: true, docs: `${PAGE}#auto-unlock` }),
    unlock_on_join: field.boolean({ help: true, docs: `${PAGE}#unlock-on-join` }),
    show_notification: field.boolean({ help: true, defaultHint: true, advanced: true, docs: PAGE }),
    always_rebuild_result: field.boolean({ help: true, advanced: true, docs: PAGE }),
    merge_components: field.boolean({ help: true, defaultHint: true, docs: CE_RECIPE_DOCS.shapeless_transform }),
    transform_processors: field.typedList('recipeTransformProcessors', () => CE_TRANSFORM_PROCESSORS, {
      help: true,
      docs: `${PAGE}#transform-processors`,
    }),
    post_processors: field.typedList('recipePostProcessors', () => CE_RESULT_POST_PROCESSORS, {
      help: true,
      docs: `${PAGE}#result-post-processor`,
    }),
    pattern: field.select(VANILLA_TRIM_PATTERNS, {
      allowCustom: true,
      help: true,
      placeholder: true,
      minVersion: '1.21.5',
      docs: CE_RECIPE_DOCS.smithing_trim,
    }),
    conditions: { ...conditionList(), help: true, docs: `${PAGE}#conditions` },
    functions: { ...functionList(), help: true, docs: `${PAGE}#functions` },
    visual_result: field.yaml({ help: true, placeholder: true, docs: `${PAGE}#visual-result` }),
  },
  SCOPE,
);
const byKey = (key: string) => fields.find((f) => f.key === key)!;

/** The categories under their own message scopes (crafting and cooking recipes have different tabs). */
const [craftingCategory, cookingCategory] = [
  ['craftingCategory', RECIPE_CRAFTING_CATEGORIES],
  ['cookingCategory', RECIPE_COOKING_CATEGORIES],
].map(
  ([name, options]) =>
    resolveFields(
      {
        category: field.select(options as typeof RECIPE_CRAFTING_CATEGORIES, {
          scope: `${SCOPE}.fields.${name as string}`,
          help: true,
          docs: `${PAGE}#group--category`,
        }),
      },
      SCOPE,
    )[0],
);

/** The keys CraftEngine reads on a recipe of each type. */
const RECIPE_OPTIONS: RecipeOption[] = [
  { field: craftingCategory, types: CRAFTING },
  { field: cookingCategory, types: COOKING },
  { field: byKey('group'), types: [...CRAFTING, ...COOKING, 'stonecutting'] },
  { field: byKey('unlock_on_ingredient_obtained'), types: ALL },
  { field: byKey('unlock_on_join'), types: ALL },
  { field: byKey('show_notification'), types: ALL },
  { field: byKey('always_rebuild_result'), types: ['shaped', 'shapeless', 'dye'] },
  { field: byKey('merge_components'), types: TRANSFORM },
  { field: byKey('transform_processors'), types: TRANSFORM },
  { field: byKey('post_processors'), types: WITH_RESULT, inResult: true },
  { field: byKey('pattern'), types: ['smithing_trim'] },
  { field: byKey('conditions'), types: WITH_LOGIC, premium: true },
  { field: byKey('functions'), types: WITH_LOGIC, premium: true },
  { field: byKey('visual_result'), types: ['shaped', 'shapeless', ...TRANSFORM], premium: true },
];

const [predicate, source] = resolveFields(
  {
    predicate: field.typedList('recipePredicates', () => CE_INGREDIENT_PREDICATES, { help: true, docs: `${PAGE}#predicate` }),
    source: field.boolean({ help: true, docs: CE_RECIPE_DOCS.shaped_transform }),
  },
  `${SCOPE}.ingredient`,
);

/** The keys CraftEngine reads on an ingredient of each type. */
const INGREDIENT_OPTIONS: RecipeOption[] = [
  { field: predicate, types: ALL },
  { field: source, types: ['shaped_transform', 'shapeless_transform'] },
];

/** CraftEngine's recipe and ingredient keys beyond the shared model. */
export const CE_RECIPE_OPTIONS: RecipeTargetOptions = { recipe: RECIPE_OPTIONS, ingredient: INGREDIENT_OPTIONS };
