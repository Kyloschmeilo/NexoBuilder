import { describe, expect, it } from 'vitest';
import {
  createItem,
  createProject,
  createRecipe,
  getRecipeTypeInfo,
  type Item,
  type Recipe,
  type RecipeIngredient,
  type RecipeType,
  setRecipeSlot,
} from '../project';
import { craftEngineIngredient, craftEngineRecipe, craftEngineRecipes } from './recipes';
import { sectionsToYaml } from './yaml';

const project = createProject('Rubine', 'ruby', '1.21.11', 'craftengine');

function sword(recipes: Recipe[]): Item {
  const item = createItem({ displayName: 'Rubin-Schwert', itemId: 'ruby_sword', folderId: 'f', material: 'DIAMOND_SWORD', model: null });
  item.recipes = recipes;
  return item;
}

/** The `recipes:` section of an item with the one recipe. */
const yamlOf = (recipe: Recipe) => sectionsToYaml({ recipes: craftEngineRecipes(project, sword([recipe])) });

/** A cooking or stonecutting recipe from a diamond. */
function fromDiamond(type: RecipeType): Recipe {
  const recipe = createRecipe(type, 'r');
  recipe.input = { source: 'minecraft', id: 'DIAMOND' };
  return recipe;
}

describe('CraftEngine recipes', () => {
  it('writes shaped recipes with the trimmed pattern and only the letters it uses', () => {
    const recipe = createRecipe('shaped', 'r');
    recipe.grid = ['', 'A', '', '', 'A', '', '', 'B', ''];
    recipe.ingredients = {
      A: { source: 'minecraft', id: 'DIAMOND' },
      B: { source: 'minecraft', id: 'STICK' },
      C: { source: 'minecraft', id: 'STONE' },
    };
    recipe.resultAmount = 2;
    expect(yamlOf(recipe)).toBe(
      [
        'recipes:',
        '  ruby:ruby_sword_shaped:',
        '    type: shaped',
        '    pattern:',
        '      - A',
        '      - A',
        '      - B',
        '    ingredients:',
        '      A: minecraft:diamond',
        '      B: minecraft:stick',
        '    result:',
        '      id: ruby:ruby_sword',
        '      count: 2',
        '',
      ].join('\n'),
    );
  });

  it('leaves shaped ingredients with a blank id out, like shapeless ones', () => {
    const recipe = createRecipe('shaped', 'r');
    recipe.grid = ['A', 'B', '', '', '', '', '', '', ''];
    recipe.ingredients = { A: { source: 'minecraft', id: 'DIAMOND' }, B: { source: 'minecraft', id: '  ' } };
    expect(craftEngineRecipe(project, sword([]), recipe)?.ingredients).toEqual({ A: 'minecraft:diamond' });
  });

  it('keeps inner gaps of a shaped pattern as spaces', () => {
    const recipe = createRecipe('shaped', 'r');
    recipe.grid = ['A', '', 'A', 'A', 'A', 'A', '', '', ''];
    recipe.ingredients = { A: { source: 'minecraft', id: 'IRON_INGOT' } };
    expect(craftEngineRecipe(project, sword([]), recipe)?.pattern).toEqual(['A A', 'AAA']);
  });

  it('writes shapeless recipes as a list of the filled ingredients', () => {
    const recipe = createRecipe('shapeless', 'r');
    recipe.ingredients = {
      A: { source: 'minecraft', id: 'DIAMOND' },
      B: { source: 'minecraft', id: '' },
      C: { source: 'tag', id: 'minecraft:planks' },
    };
    expect(yamlOf(recipe)).toBe(
      [
        'recipes:',
        '  ruby:ruby_sword_shapeless:',
        '    type: shapeless',
        '    ingredients:',
        '      - minecraft:diamond',
        '      - "#minecraft:planks"',
        '    result:',
        '      id: ruby:ruby_sword',
        '      count: 1',
        '',
      ].join('\n'),
    );
  });

  it('writes furnace recipes as smelting with time and experience', () => {
    const recipe = fromDiamond('furnace');
    recipe.cookingTime = 199.6;
    recipe.experience = 0.7;
    expect(yamlOf(recipe)).toBe(
      [
        'recipes:',
        '  ruby:ruby_sword_furnace:',
        '    type: smelting',
        '    ingredient: minecraft:diamond',
        '    time: 200',
        '    experience: 0.7',
        '    result:',
        '      id: ruby:ruby_sword',
        '      count: 1',
        '',
      ].join('\n'),
    );
  });

  it.each([
    ['blasting', 'blasting', 100],
    ['smoking', 'smoking', 100],
    ['campfire', 'campfire_cooking', 600],
  ] as const)('writes %s recipes as %s', (type, ceType, time) => {
    expect(yamlOf(fromDiamond(type))).toBe(
      [
        'recipes:',
        `  ruby:ruby_sword_${type}:`,
        `    type: ${ceType}`,
        '    ingredient: minecraft:diamond',
        `    time: ${time}`,
        '    experience: 0.1',
        '    result:',
        '      id: ruby:ruby_sword',
        '      count: 1',
        '',
      ].join('\n'),
    );
  });

  it('writes stonecutting recipes without time and experience', () => {
    expect(yamlOf(fromDiamond('stonecutting'))).toBe(
      [
        'recipes:',
        '  ruby:ruby_sword_stonecutting:',
        '    type: stonecutting',
        '    ingredient: minecraft:diamond',
        '    result:',
        '      id: ruby:ruby_sword',
        '      count: 1',
        '',
      ].join('\n'),
    );
  });

  it('writes vanilla items, project items and tags, and the object form for an amount', () => {
    expect(craftEngineIngredient(project, { source: 'minecraft', id: ' GOLD_INGOT ' })).toBe('minecraft:gold_ingot');
    expect(craftEngineIngredient(project, { source: 'nexo', id: 'ruby' })).toBe('ruby:ruby');
    expect(craftEngineIngredient(project, { source: 'tag', id: 'planks' })).toBe('#minecraft:planks');
    expect(craftEngineIngredient(project, { source: 'tag', id: 'ruby:gems' })).toBe('#ruby:gems');
    expect(craftEngineIngredient(project, { source: 'minecraft', id: 'DIAMOND', amount: 1 })).toBe('minecraft:diamond');
    expect(craftEngineIngredient(project, { source: 'nexo', id: 'ruby', amount: 3 })).toEqual({ items: 'ruby:ruby', count: 3 });
  });

  it('keys each recipe like Nexo does, numbering recipes of the same type', () => {
    const keys = Object.keys(craftEngineRecipes(project, sword([fromDiamond('furnace'), fromDiamond('furnace')])));
    expect(keys).toEqual(['ruby:ruby_sword_furnace', 'ruby:ruby_sword_furnace_2']);
  });

  it('writes the Premium visual_result only when the recipe sets it', () => {
    const recipe = createRecipe('shaped', 'r');
    recipe.grid = ['A', '', '', '', '', '', '', '', ''];
    recipe.ingredients = { A: { source: 'minecraft', id: 'DIAMOND' } };
    expect(craftEngineRecipe(project, sword([]), recipe)).not.toHaveProperty('visual_result');
    recipe.options = { visual_result: { id: 'ruby:ruby_sword', count: 1 } };
    expect(craftEngineRecipe(project, sword([]), recipe)).toHaveProperty('visual_result', { id: 'ruby:ruby_sword', count: 1 });
  });

  it('leaves out recipe types CraftEngine has no type for', () => {
    const crafter = createRecipe('crafter', 'r');
    crafter.grid = ['A', '', '', '', '', '', '', '', ''];
    crafter.ingredients = { A: { source: 'minecraft', id: 'DIAMOND' } };
    expect(craftEngineRecipe(project, sword([]), crafter)).toBeNull();
    expect(craftEngineRecipe(project, sword([]), fromDiamond('transmute'))).toBeNull();
    expect(craftEngineRecipe(project, sword([]), fromDiamond('anvil'))).toBeNull();
    expect(Object.keys(craftEngineRecipes(project, sword([crafter, fromDiamond('smoking')])))).toEqual(['ruby:ruby_sword_smoking']);
  });
});

/** A recipe of the type whose slots are filled in order with these ingredients. */
function withSlots(type: RecipeType, ...ingredients: Array<RecipeIngredient | undefined>): Recipe {
  const recipe = createRecipe(type, 'r');
  getRecipeTypeInfo(type).slots.forEach((slot, i) => {
    const ingredient = ingredients[i];
    if (ingredient) setRecipeSlot(recipe, slot, ingredient);
    else if (slot !== 'input') delete recipe.slots?.[slot];
  });
  return recipe;
}

describe('CraftEngine recipe types beyond crafting and cooking', () => {
  it('writes shaped transform recipes with the source ingredient, the merge flag and transform processors', () => {
    const recipe = createRecipe('shaped_transform', 'r');
    recipe.grid = ['B', 'B', 'B', 'B', '', '', 'A', '', ''];
    recipe.ingredients = {
      A: { source: 'minecraft', id: 'CROSSBOW', options: { source: true } },
      B: { source: 'nexo', id: 'topaz' },
    };
    recipe.options = {
      merge_components: false,
      transform_processors: [{ type: 'keep_components', components: ['minecraft:enchantments'] }, { type: 'merge_enchantments' }],
      category: 'equipment',
      group: 'crossbows',
    };
    expect(craftEngineRecipe(project, sword([]), recipe)).toEqual({
      type: 'shaped_transform',
      pattern: ['BBB', 'B  ', 'A  '],
      ingredients: { A: { items: 'minecraft:crossbow', source: true }, B: 'ruby:topaz' },
      result: { id: 'ruby:ruby_sword', count: 1 },
      category: 'equipment',
      group: 'crossbows',
      merge_components: false,
      transform_processors: [{ type: 'keep_components', components: ['minecraft:enchantments'] }, { type: 'merge_enchantments' }],
    });
  });

  it('writes shapeless transform recipes as a list with the source ingredient', () => {
    const recipe = createRecipe('shapeless_transform', 'r');
    recipe.ingredients = {
      A: { source: 'minecraft', id: 'DIAMOND_SWORD', options: { source: true } },
      B: { source: 'nexo', id: 'topaz', options: { source: false } },
    };
    expect(craftEngineRecipe(project, sword([]), recipe)).toMatchObject({
      type: 'shapeless_transform',
      ingredients: [{ items: 'minecraft:diamond_sword', source: true }, 'ruby:topaz'],
    });
  });

  it('writes smithing transform recipes with template_type, base, addition and the result post processors', () => {
    const recipe = withSlots('smithing_transform', { source: 'nexo', id: 'topaz' }, { source: 'minecraft', id: 'BOW' }, undefined);
    recipe.options = { post_processors: [{ type: 'apply_data', data: { enchantment: { 'minecraft:power': 5 } } }] };
    expect(craftEngineRecipe(project, sword([]), recipe)).toEqual({
      type: 'smithing_transform',
      template_type: 'ruby:topaz',
      base: 'minecraft:bow',
      result: {
        id: 'ruby:ruby_sword',
        count: 1,
        post_processors: [{ type: 'apply_data', data: { enchantment: { 'minecraft:power': 5 } } }],
      },
    });
  });

  it('writes smithing trim recipes with their pattern and without a result', () => {
    const recipe = withSlots(
      'smithing_trim',
      { source: 'minecraft', id: 'BOLT_ARMOR_TRIM_SMITHING_TEMPLATE' },
      { source: 'tag', id: 'trimmable_tool' },
      { source: 'tag', id: 'trim_materials' },
    );
    recipe.options = { pattern: 'minecraft:bolt', trim_pattern: 'ignored' };
    expect(craftEngineRecipe(project, sword([]), recipe)).toEqual({
      type: 'smithing_trim',
      template_type: 'minecraft:bolt_armor_trim_smithing_template',
      base: '#minecraft:trimmable_tool',
      addition: '#minecraft:trim_materials',
      pattern: 'minecraft:bolt',
    });
  });

  it('writes brewing recipes with ingredient, container and result', () => {
    const recipe = withSlots('brewing', { source: 'nexo', id: 'cup' }, { source: 'nexo', id: 'tea_leaf' });
    expect(craftEngineRecipe(project, sword([]), recipe)).toEqual({
      type: 'brewing',
      container: 'ruby:cup',
      ingredient: 'ruby:tea_leaf',
      result: { id: 'ruby:ruby_sword', count: 1 },
    });
  });

  it('writes dye recipes with their target and dye', () => {
    const recipe = withSlots('dye', { source: 'nexo', id: 'cloak' }, { source: 'tag', id: 'dyes' });
    recipe.options = { category: 'misc', always_rebuild_result: false };
    expect(craftEngineRecipe(project, sword([]), recipe)).toEqual({
      type: 'dye',
      target: 'ruby:cloak',
      dye: '#minecraft:dyes',
      result: { id: 'ruby:ruby_sword', count: 1 },
      category: 'misc',
      always_rebuild_result: false,
    });
  });

  it('writes alternatives as a list of ids, and predicates and counts in the object form', () => {
    expect(
      craftEngineIngredient(project, {
        source: 'external',
        id: 'mythicmobs:kingscrown',
        alternatives: [
          { source: 'minecraft', id: 'GOLDEN_HELMET' },
          { source: 'tag', id: '' },
        ],
      }),
    ).toEqual(['mythicmobs:kingscrown', 'minecraft:golden_helmet']);
    expect(
      craftEngineIngredient(project, {
        source: 'minecraft',
        id: 'PAPER',
        amount: 2,
        options: { predicate: [{ type: 'enchantment', enchantments: { 'minecraft:sharpness': 5 } }] },
      }),
    ).toEqual({ items: 'minecraft:paper', count: 2, predicate: [{ type: 'enchantment', enchantments: { 'minecraft:sharpness': 5 } }] });
  });

  it('leaves out ingredients of sources CraftEngine does not read and the source flag outside transform recipes', () => {
    expect(craftEngineIngredient(project, { source: 'crucible', id: 'sword' })).toBeUndefined();
    expect(craftEngineIngredient(project, { source: 'mmoitems', id: 'CUTLASS', itemType: 'SWORD' })).toBeUndefined();
    expect(craftEngineIngredient(project, { source: 'minecraft', id: 'STICK', options: { source: true } }, 'shaped')).toBe(
      'minecraft:stick',
    );
  });

  it('writes the recipe book and unlock keys and the Premium conditions and functions, but not the keys of Nexo', () => {
    const recipe = fromDiamond('furnace');
    recipe.options = {
      category: 'food',
      group: 'gems',
      unlock_on_join: true,
      unlock_on_ingredient_obtained: false,
      permission: 'nexo.only',
      conditions: [{ type: 'permission', permission: 'recipe.unlock' }],
      functions: [{ type: 'command', command: 'say 1' }],
    };
    expect(craftEngineRecipe(project, sword([]), recipe)).toEqual({
      type: 'smelting',
      ingredient: 'minecraft:diamond',
      time: 200,
      experience: 0.1,
      result: { id: 'ruby:ruby_sword', count: 1 },
      category: 'food',
      group: 'gems',
      unlock_on_ingredient_obtained: false,
      unlock_on_join: true,
      conditions: [{ type: 'permission', permission: 'recipe.unlock' }],
      functions: [{ type: 'command', command: 'say 1' }],
    });
  });
});
