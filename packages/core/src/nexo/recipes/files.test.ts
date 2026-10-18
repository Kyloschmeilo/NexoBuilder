/** Nexo's recipe files for the recipe types beyond crafting and cooking, their ingredient predicates and keys. */
import { describe, expect, it } from 'vitest';
import {
  createItem,
  createProject,
  createRecipe,
  getRecipeTypeInfo,
  insertItem,
  type Recipe,
  type RecipeIngredient,
  type RecipeType,
  setRecipeSlot,
} from '../../project';
import { buildRecipeFiles, disabledRecipesFile, recipeFilePath, recipeToYaml } from './files';

function setup() {
  const project = createProject('Rubine', 'ruby', '26.3');
  const item = createItem({ displayName: 'Rubin-Schwert', itemId: 'ruby_sword', folderId: 'f', model: null });
  insertItem(project, item);
  return { project, item };
}

/** A recipe of the type whose slots are filled in order with these ingredients. */
function withSlots(type: RecipeType, ...ingredients: RecipeIngredient[]): Recipe {
  const recipe = createRecipe(type, 'r');
  getRecipeTypeInfo(type).slots.forEach((slot, i) => setRecipeSlot(recipe, slot, ingredients[i]));
  return recipe;
}

const diamond: RecipeIngredient = { source: 'minecraft', id: 'diamond' };

describe('Nexo recipe types', () => {
  it('writes crafter recipes like shaped ones into recipes/crafter', () => {
    const { project, item } = setup();
    const recipe = createRecipe('crafter', 'r');
    recipe.grid = ['A', 'A', '', '', '', '', '', '', ''];
    recipe.ingredients = { A: diamond };
    expect(recipeToYaml(recipe, item)).toEqual({
      result: { nexo_item: 'ruby_sword' },
      shape: ['AA'],
      ingredients: { A: { minecraft_type: 'DIAMOND' } },
    });
    expect(recipeFilePath(project, 'crafter')).toBe('recipes/crafter/rubine.yml');
  });

  it('writes brewing recipes with input and ingredient', () => {
    const { item } = setup();
    const recipe = withSlots('brewing', { source: 'minecraft', id: 'GLASS_BOTTLE' }, { source: 'nexo', id: 'rainbow_ingot' });
    expect(recipeToYaml(recipe, item)).toEqual({
      result: { nexo_item: 'ruby_sword' },
      input: { minecraft_type: 'GLASS_BOTTLE' },
      ingredient: { nexo_item: 'rainbow_ingot' },
    });
  });

  it('writes both smithing types into recipes/smithing: upgrades with a result, trims with a pattern', () => {
    const { project, item } = setup();
    const upgrade = withSlots(
      'smithing_transform',
      { source: 'minecraft', id: 'NETHERITE_UPGRADE_SMITHING_TEMPLATE' },
      { source: 'nexo', id: 'forest_sword' },
      { source: 'minecraft', id: 'NETHERITE_INGOT' },
    );
    upgrade.options = { copy_components: true };
    expect(recipeToYaml(upgrade, item)).toEqual({
      result: { nexo_item: 'ruby_sword' },
      template: { minecraft_type: 'NETHERITE_UPGRADE_SMITHING_TEMPLATE' },
      base: { nexo_item: 'forest_sword' },
      addition: { minecraft_type: 'NETHERITE_INGOT' },
      copy_components: true,
    });
    const trim = withSlots(
      'smithing_trim',
      { source: 'minecraft', id: 'PAPER' },
      { source: 'minecraft', id: 'IRON_CHESTPLATE' },
      { source: 'minecraft', id: 'AMETHYST_SHARD' },
    );
    trim.options = { trim_pattern: 'minecraft:silence', pattern: 'craftengine.only' };
    expect(recipeToYaml(trim, item)).toEqual({
      template: { minecraft_type: 'PAPER' },
      base: { minecraft_type: 'IRON_CHESTPLATE' },
      addition: { minecraft_type: 'AMETHYST_SHARD' },
      trim_pattern: 'minecraft:silence',
    });
    item.recipes = [upgrade, trim];
    const files = buildRecipeFiles(project, [item]);
    expect([...files.keys()]).toEqual(['recipes/smithing/rubine.yml']);
    expect(files.get('recipes/smithing/rubine.yml')).toContain('ruby_sword_smithing_transform:');
    expect(files.get('recipes/smithing/rubine.yml')).toContain('ruby_sword_smithing_trim:');
  });

  it('writes transmute recipes with the components they preserve', () => {
    const { item } = setup();
    const recipe = withSlots('transmute', { source: 'nexo', id: 'forest_sword' }, { source: 'minecraft', id: 'LAPIS_LAZULI' });
    recipe.options = { preserve: ['damage', 'enchantments'], group: 'swords' };
    expect(recipeToYaml(recipe, item)).toEqual({
      result: { nexo_item: 'ruby_sword' },
      input: { nexo_item: 'forest_sword' },
      material: { minecraft_type: 'LAPIS_LAZULI' },
      group: 'swords',
      preserve: ['damage', 'enchantments'],
    });
  });

  it('writes anvil recipes with their cost, and a repair amount instead of the result', () => {
    const { item } = setup();
    const recipe = withSlots('anvil', { source: 'nexo', id: 'ruby_sword' }, { source: 'nexo', id: 'ruby' });
    recipe.options = { cost: 5 };
    expect(recipeToYaml(recipe, item)).toEqual({
      result: { nexo_item: 'ruby_sword' },
      input: { nexo_item: 'ruby_sword' },
      material: { nexo_item: 'ruby' },
      cost: 5,
    });
    recipe.options = { cost: 2, repair: 100 };
    expect(recipeToYaml(recipe, item)).toEqual({
      input: { nexo_item: 'ruby_sword' },
      material: { nexo_item: 'ruby' },
      cost: 2,
      repair: 100,
    });
  });

  it('leaves out the recipe types only CraftEngine reads', () => {
    const { project, item } = setup();
    const recipe = createRecipe('shapeless_transform', 'r');
    recipe.ingredients = { A: diamond };
    item.recipes = [recipe];
    expect(buildRecipeFiles(project, [item]).size).toBe(0);
  });
});

describe('Nexo ingredients and recipe keys', () => {
  it('writes the replacement, durability damage and preserve predicates of crafting ingredients', () => {
    const { item } = setup();
    const recipe = createRecipe('shapeless', 'r');
    recipe.ingredients = {
      A: { source: 'minecraft', id: 'water_bucket', replacement: { source: 'minecraft', id: 'bucket' } },
      B: { source: 'tag', id: 'swords', options: { damage: 1 } },
      C: { source: 'minecraft', id: 'diamond_axe', options: { preserve: ['damage', 'enchantments'], predicate: [{ type: 'exact' }] } },
    };
    expect(recipeToYaml(recipe, item).ingredients).toEqual({
      A: { minecraft_type: 'WATER_BUCKET', replacement: { minecraft_type: 'BUCKET' } },
      B: { tag: 'swords', damage: 1 },
      C: { minecraft_type: 'DIAMOND_AXE', preserve: ['damage', 'enchantments'] },
    });
  });

  it('reads crafting predicates only on crafting recipes', () => {
    const { item } = setup();
    const recipe = createRecipe('furnace', 'r');
    recipe.input = { source: 'minecraft', id: 'iron_ore', options: { damage: 1 }, replacement: { source: 'minecraft', id: 'stone' } };
    expect(recipeToYaml(recipe, item).input).toEqual({ minecraft_type: 'IRON_ORE' });
  });

  it('writes MythicCrucible and MMOItems ingredients and leaves out sources only CraftEngine reads', () => {
    const { item } = setup();
    const recipe = createRecipe('shapeless', 'r');
    recipe.ingredients = {
      A: { source: 'crucible', id: 'mythic_blade' },
      B: { source: 'mmoitems', id: 'CUTLASS', itemType: 'sword' },
      C: { source: 'external', id: 'mythicmobs:kingscrown' },
    };
    expect(recipeToYaml(recipe, item).ingredients).toEqual({
      A: { crucible_item: 'mythic_blade' },
      B: { mmoitems_type: 'SWORD', mmoitems_id: 'CUTLASS' },
    });
  });

  it('writes permission, group and category but not the keys of CraftEngine', () => {
    const { item } = setup();
    const recipe = createRecipe('furnace', 'r');
    recipe.input = diamond;
    recipe.options = { permission: 'ruby.craft', group: 'gems', category: 'misc', unlock_on_join: true, conditions: [] };
    expect(recipeToYaml(recipe, item)).toEqual({
      result: { nexo_item: 'ruby_sword' },
      input: { minecraft_type: 'DIAMOND' },
      cookingTime: 200,
      experience: 0.1,
      permission: 'ruby.craft',
      group: 'gems',
      category: 'misc',
    });
  });
});

describe('disabled vanilla recipes', () => {
  it('writes recipes/disabled_recipes.yml with the distinct keys, and nothing without any', () => {
    const { project } = setup();
    expect(disabledRecipesFile(project)).toBeNull();
    project.settings.disabledRecipes = ['minecraft:diamond_sword', ' ', 'minecraft:diamond_sword ', 'minecraft:torch'];
    const text = disabledRecipesFile(project);
    expect(text).toContain('disabled_recipes:\n  - minecraft:diamond_sword\n  - minecraft:torch\n');
    expect(buildRecipeFiles(project, []).get('recipes/disabled_recipes.yml')).toBe(text);
  });
});
