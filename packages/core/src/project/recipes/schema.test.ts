/**
 * Stored recipes across versions: recipes saved before the slots, options and ingredient extras existed read back
 * unchanged, the new fields round-trip, and damaged values of them are dropped without losing the recipe.
 */
import { describe, expect, it } from 'vitest';
import { migrateItem, migrateProject } from '../migrate';
import { createProject } from '../factory';
import { RecipeSchema } from '../schema';
import { createRecipe } from './model';

/** A recipe as projects stored it before the new recipe types. */
const storedFurnace = {
  id: 'r_1',
  type: 'furnace',
  resultAmount: 2,
  grid: ['', '', '', '', '', '', '', '', ''],
  ingredients: {},
  input: { source: 'minecraft', id: 'IRON_ORE', amount: 2 },
  cookingTime: 200,
  experience: 0.7,
};

describe('stored recipes', () => {
  it('reads recipes stored before slots and options unchanged', () => {
    expect(RecipeSchema.parse(storedFurnace)).toEqual(storedFurnace);
    const item = migrateItem({ id: 'i_1', itemId: 'iron', recipes: [storedFurnace] });
    expect(item?.recipes).toEqual([storedFurnace]);
    expect(Object.keys(item!.recipes[0])).not.toContain('slots');
    expect(Object.keys(item!.recipes[0])).not.toContain('options');
  });

  it('round-trips the slots, options and ingredient extras of the new recipe types', () => {
    const recipe = createRecipe('smithing_transform', 'r_2');
    recipe.slots = {
      template: { source: 'mmoitems', id: 'CUTLASS', itemType: 'SWORD' },
      base: { source: 'external', id: 'mythicmobs:crown', alternatives: [{ source: 'tag', id: 'swords' }] },
      addition: { source: 'minecraft', id: 'STICK', replacement: { source: 'minecraft', id: 'BUCKET' }, options: { damage: 1 } },
    };
    recipe.options = { copy_components: true, transform_processors: [{ type: 'merge_enchantments' }] };
    expect(RecipeSchema.parse(JSON.parse(JSON.stringify(recipe)))).toEqual(recipe);
  });

  it('drops damaged new fields and keeps the recipe', () => {
    const parsed = RecipeSchema.parse({
      ...storedFurnace,
      type: 'brewing',
      slots: { reagent: { source: 'crucible', id: 'leaf' }, base: 'nonsense', unknown: { id: 'x' } },
      options: 'not an object',
      input: { source: 'unknown', id: 'GLASS_BOTTLE', alternatives: 'bad', options: [1] },
    });
    expect(parsed.slots).toEqual({ reagent: { source: 'crucible', id: 'leaf' } });
    expect(parsed).not.toHaveProperty('options');
    expect(parsed.input).toEqual({ source: 'minecraft', id: 'GLASS_BOTTLE' });
  });

  it('drops recipes of unknown types', () => {
    const item = migrateItem({ id: 'i_1', itemId: 'iron', recipes: [{ ...storedFurnace, type: 'loom' }, storedFurnace] });
    expect(item?.recipes).toEqual([storedFurnace]);
  });

  it('keeps the disabled vanilla recipes of the settings and leaves them out of projects without any', () => {
    const project = createProject('Rubine', 'ruby', '26.3');
    expect(migrateProject(JSON.parse(JSON.stringify(project))).settings).not.toHaveProperty('disabledRecipes');
    project.settings.disabledRecipes = ['minecraft:torch'];
    expect(migrateProject(JSON.parse(JSON.stringify(project))).settings.disabledRecipes).toEqual(['minecraft:torch']);
    const damaged = { ...project, settings: { ...project.settings, disabledRecipes: ['minecraft:torch', 3] } };
    expect(migrateProject(JSON.parse(JSON.stringify(damaged))).settings.disabledRecipes).toEqual(['minecraft:torch']);
  });
});
