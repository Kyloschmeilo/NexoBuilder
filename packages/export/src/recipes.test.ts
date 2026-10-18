import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { planExport } from './plan';
import { buildMultiExportZip } from './zip';
import { singleExport } from '../test-utils/export';
import {
  createFolder,
  createItem,
  createProject,
  createRecipe,
  insertFolder,
  insertItem,
  validateRecipe,
} from '@resourcepackbuilder/core/project';
import { buildRecipeFiles, recipeToYaml } from '@resourcepackbuilder/core/nexo';

function setup() {
  const project = createProject('Rezept Test', 'rezepte', '26.3');
  const folder = createFolder('Waffen', null);
  insertFolder(project, folder);
  const item = createItem({ displayName: 'Rubin-Schwert', itemId: 'ruby_sword', folderId: folder.id, model: null });
  insertItem(project, item);
  return { project, item };
}

describe('recipe shape', () => {
  it('removes empty border rows and columns', () => {
    const { item } = setup();
    const shapeOf = (grid: string[]) => recipeToYaml({ ...createRecipe('shaped', 'r'), grid }, item).shape;
    expect(shapeOf(['', 'A', '', '', 'A', '', '', 'B', ''])).toEqual(['A', 'A', 'B']);
    expect(shapeOf(['A', 'A', '', 'A', 'A', '', '', '', ''])).toEqual(['AA', 'AA']);
    expect(shapeOf(['A', '', 'A', '', 'B', '', 'A', '', 'A'])).toEqual(['A A', ' B ', 'A A']);
    expect(shapeOf(Array(9).fill(''))).toEqual([]);
  });
});

describe('recipes', () => {
  it('writes shaped recipes in Nexo format', () => {
    const { item } = setup();
    const recipe = createRecipe('shaped', 'r1');
    recipe.grid = ['', 'A', '', '', 'A', '', '', 'B', ''];
    recipe.ingredients = {
      A: { source: 'minecraft', id: 'diamond' },
      B: { source: 'tag', id: 'planks' },
      C: { source: 'minecraft', id: 'STONE' },
    };
    recipe.resultAmount = 2;
    expect(recipeToYaml(recipe, item)).toEqual({
      result: { nexo_item: 'ruby_sword', amount: 2 },
      shape: ['A', 'A', 'B'],
      ingredients: { A: { minecraft_type: 'DIAMOND' }, B: { tag: 'planks' } },
    });
  });

  it('leaves shaped ingredients with a blank id out, like shapeless ones', () => {
    const { item } = setup();
    const recipe = createRecipe('shaped', 'r1');
    recipe.grid = ['A', 'B', '', '', '', '', '', '', ''];
    recipe.ingredients = { A: { source: 'minecraft', id: 'diamond' }, B: { source: 'minecraft', id: ' ' } };
    expect(recipeToYaml(recipe, item).ingredients).toEqual({ A: { minecraft_type: 'DIAMOND' } });
  });

  it('writes shapeless and furnace recipes', () => {
    const { item } = setup();
    const shapeless = createRecipe('shapeless', 'r2');
    shapeless.ingredients = { A: { source: 'nexo', id: 'ruby', amount: 2 }, B: { source: 'minecraft', id: 'STICK' } };
    expect(recipeToYaml(shapeless, item)).toEqual({
      result: { nexo_item: 'ruby_sword' },
      ingredients: { A: { nexo_item: 'ruby', amount: 2 }, B: { minecraft_type: 'STICK' } },
    });
    const furnace = createRecipe('furnace', 'r3');
    furnace.input = { source: 'minecraft', id: 'IRON_SWORD' };
    furnace.cookingTime = 150;
    furnace.experience = 1.5;
    expect(recipeToYaml(furnace, item)).toEqual({
      result: { nexo_item: 'ruby_sword' },
      input: { minecraft_type: 'IRON_SWORD' },
      cookingTime: 150,
      experience: 1.5,
    });
    const cutter = createRecipe('stonecutting', 'r4');
    cutter.input = { source: 'minecraft', id: 'STONE' };
    expect(recipeToYaml(cutter, item)).toEqual({ result: { nexo_item: 'ruby_sword' }, input: { minecraft_type: 'STONE' } });
  });

  it('validates incomplete recipes', () => {
    const { project } = setup();
    const empty = createRecipe('shaped', 'x');
    expect(validateRecipe(empty, project, 'k').some((i) => i.level === 'error')).toBe(true);
    const furnace = createRecipe('furnace', 'y');
    expect(validateRecipe(furnace, project, 'k')).toContainEqual({
      level: 'error',
      code: 'recipe.ingredientMissing',
      context: [{ code: 'context.recipeInput', args: { recipe: 'k' } }],
    });
    furnace.input = { source: 'minecraft', id: 'RAW IRON' };
    expect(validateRecipe(furnace, project, 'k').some((i) => i.code === 'recipe.materialInvalid')).toBe(true);
    furnace.input = { source: 'minecraft', id: 'RAW_IRON' };
    expect(validateRecipe(furnace, project, 'k')).toEqual([]);
  });

  it('stores recipes per type in recipes/<type>/ and assigns unique keys', async () => {
    const { project, item } = setup();
    const a = createRecipe('shaped', 'a');
    a.grid = ['A', 'A', '', '', '', '', '', '', ''];
    a.ingredients = { A: { source: 'minecraft', id: 'DIAMOND' } };
    const b = createRecipe('shaped', 'b');
    b.grid = ['A', '', '', '', '', '', '', '', ''];
    b.ingredients = { A: { source: 'minecraft', id: 'EMERALD' } };
    const c = createRecipe('blasting', 'c');
    c.input = { source: 'minecraft', id: 'IRON_SWORD' };
    item.recipes = [a, b, c];
    const files = buildRecipeFiles(project, [item]);
    expect([...files.keys()].sort()).toEqual(['recipes/blasting/rezept_test.yml', 'recipes/shaped/rezept_test.yml']);
    const shaped = parse(files.get('recipes/shaped/rezept_test.yml')!, { version: '1.1' });
    expect(Object.keys(shaped)).toEqual(['ruby_sword_shaped', 'ruby_sword_shaped_2']);
    expect(shaped.ruby_sword_shaped.shape).toEqual(['AA']);

    const plan = planExport(project);
    expect([...plan.pluginFiles.keys()].filter((p) => p.startsWith('recipes/'))).toHaveLength(2);
    const zip = await buildMultiExportZip(singleExport(project, plan), 'full');
    expect(zip.paths).toContain('recipes/shaped/rezept_test.yml');
    const pack = await buildMultiExportZip(singleExport(project, plan), 'pack');
    expect(pack.paths.some((p) => p.startsWith('recipes/'))).toBe(false);
  });

  it('writes the smithing folder, the disabled vanilla recipes and the type warnings into the Nexo export', () => {
    const { project, item } = setup();
    const trim = createRecipe('smithing_trim', 't');
    trim.slots = {
      template: { source: 'minecraft', id: 'PAPER' },
      base: { source: 'minecraft', id: 'IRON_CHESTPLATE' },
      addition: { source: 'minecraft', id: 'AMETHYST_SHARD' },
    };
    trim.options = { trim_pattern: 'minecraft:silence' };
    const dye = createRecipe('dye', 'd');
    item.recipes = [trim, dye];
    project.settings.disabledRecipes = ['minecraft:diamond_sword'];
    const plan = planExport(project);
    expect([...plan.pluginFiles.keys()].filter((p) => p.startsWith('recipes/')).sort()).toEqual([
      'recipes/disabled_recipes.yml',
      'recipes/smithing/rezept_test.yml',
    ]);
    expect(parse(String(plan.pluginFiles.get('recipes/disabled_recipes.yml')))).toEqual({ disabled_recipes: ['minecraft:diamond_sword'] });
    expect(plan.issues.filter((i) => i.code.startsWith('recipe.')).map((i) => [i.code, i.args])).toEqual([
      ['recipe.typeUnsupported', { target: 'Nexo', type: 'dye' }],
    ]);
  });
});
