import { describe, expect, it } from 'vitest';
import { createItem, createProject, createRecipe, type Item, type Recipe, type RecipeType } from '../project';
import { craftEngineIngredient, craftEngineRecipe, craftEngineRecipes } from './recipes';
import { sectionsToYaml } from './yaml';

const project = createProject('Rubine', 'ruby', '1.21.11', 'craftengine');

function sword(recipes: Recipe[]): Item {
  const item = createItem({ displayName: 'Rubin-Schwert', itemId: 'ruby_sword', folderId: 'f', material: 'DIAMOND_SWORD', model: null });
  item.recipes = recipes;
  return item;
}

/** The `recipes:` section of an item with the one recipe. */
const yamlOf = (recipe: Recipe) => sectionsToYaml({ recipes: craftEngineRecipes(project, sword([recipe])).recipes });

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
    const keys = Object.keys(craftEngineRecipes(project, sword([fromDiamond('furnace'), fromDiamond('furnace')])).recipes);
    expect(keys).toEqual(['ruby:ruby_sword_furnace', 'ruby:ruby_sword_furnace_2']);
  });

  it('never writes the Premium visual_result', () => {
    const recipe = createRecipe('shaped', 'r');
    recipe.grid = ['A', '', '', '', '', '', '', '', ''];
    recipe.ingredients = { A: { source: 'minecraft', id: 'DIAMOND' } };
    expect(craftEngineRecipe(project, sword([]), recipe)).not.toHaveProperty('visual_result');
  });

  it('leaves out recipe kinds CraftEngine has no type for', () => {
    const unknown = { ...fromDiamond('furnace'), type: 'brewing' as RecipeType };
    expect(craftEngineRecipe(project, sword([]), unknown)).toBeNull();
    const result = craftEngineRecipes(project, sword([unknown, fromDiamond('smoking')]));
    expect(Object.keys(result.recipes)).toEqual(['ruby:ruby_sword_smoking']);
    expect(result.unsupported).toEqual([{ key: 'ruby_sword_brewing', type: 'brewing' }]);
  });
});
