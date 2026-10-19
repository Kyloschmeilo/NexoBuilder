/** The recipe checks per target: unsupported types and sources, slots, source ingredients and trim patterns. */
import { describe, expect, it } from 'vitest';
import { createItem, createProject, insertItem } from '../index';
import type { PackTargetId } from '../target';
import { createRecipe, getRecipeTypeInfo, type Recipe, type RecipeIngredient, type RecipeType } from './model';
import { setRecipeSlot } from './operations';
import { recipeIssues } from './issues';
import { validateRecipe } from './validate';

function projectFor(target: PackTargetId) {
  const project = createProject('Rubine', 'ruby', '26.3', target);
  insertItem(project, createItem({ displayName: 'Rubin', itemId: 'ruby', folderId: 'f', model: null }));
  return project;
}

const codes = (recipe: Recipe, target: PackTargetId) => validateRecipe(recipe, projectFor(target), 'key').map((issue) => issue.code);

function withSlots(type: RecipeType, ...ingredients: Array<RecipeIngredient | undefined>): Recipe {
  const recipe = createRecipe(type, 'r');
  getRecipeTypeInfo(type).slots.forEach((slot, i) => {
    const ingredient = ingredients[i];
    if (ingredient) setRecipeSlot(recipe, slot, ingredient);
  });
  return recipe;
}

const diamond: RecipeIngredient = { source: 'minecraft', id: 'DIAMOND' };

describe('recipe checks per target', () => {
  it('warns about recipe types the target does not read and checks nothing else', () => {
    expect(codes(createRecipe('crafter', 'r'), 'craftengine')).toEqual(['recipe.typeUnsupported']);
    expect(codes(createRecipe('dye', 'r'), 'nexo')).toEqual(['recipe.typeUnsupported']);
    const issue = validateRecipe(createRecipe('anvil', 'r'), projectFor('craftengine'), 'key')[0];
    expect(issue.level).toBe('warning');
    expect(issue.args).toEqual({ target: 'CraftEngine', type: 'anvil' });
  });

  it('warns about a recipe type the project version does not have yet', () => {
    const recipe = withSlots('dye', { source: 'nexo', id: 'ruby' }, { source: 'tag', id: 'minecraft:dyes' });
    expect(codes(recipe, 'craftengine')).toEqual([]);
    const project = projectFor('craftengine');
    project.settings.minecraftVersion = '1.21.11';
    const issues = validateRecipe(recipe, project, 'key');
    expect(issues.map((issue) => [issue.code, issue.level, issue.args])).toEqual([
      ['recipe.typeNeedsVersion', 'warning', { type: 'dye', version: '26.1' }],
    ]);
  });

  it('reports ingredient sources the target does not read', () => {
    const recipe = createRecipe('stonecutting', 'r');
    recipe.input = { source: 'crucible', id: 'blade' };
    expect(codes(recipe, 'craftengine')).toEqual(['recipe.sourceUnsupported']);
    expect(codes(recipe, 'nexo')).toEqual([]);
    recipe.input = { source: 'external', id: 'mythicmobs:crown' };
    expect(codes(recipe, 'nexo')).toEqual(['recipe.sourceUnsupported']);
    expect(codes(recipe, 'craftengine')).toEqual([]);
  });

  it('checks external ids, MMOItems types and CraftEngine alternatives', () => {
    const recipe = createRecipe('stonecutting', 'r');
    recipe.input = { source: 'external', id: 'crown', alternatives: [{ source: 'tag', id: '' }] };
    expect(codes(recipe, 'craftengine')).toEqual(['recipe.externalIdInvalid', 'recipe.alternativeMissing']);
    recipe.input = { source: 'mmoitems', id: 'CUTLASS' };
    expect(codes(recipe, 'nexo')).toEqual(['recipe.mmoitemsTypeMissing']);
  });

  it('requires every slot, except the smithing template and addition on CraftEngine', () => {
    const recipe = withSlots('smithing_transform', undefined, diamond, undefined);
    recipe.slots = { base: diamond };
    expect(codes(recipe, 'craftengine')).toEqual([]);
    const issues = validateRecipe(recipe, projectFor('nexo'), 'key');
    expect(issues.map((issue) => issue.code)).toEqual(['recipe.ingredientMissing', 'recipe.ingredientMissing']);
    expect(issues[0].context).toEqual([
      { code: 'context.recipeSlot', args: { recipe: 'key', slot: { key: 'recipes.slots.template.label' }, slotName: 'template' } },
    ]);
    expect(recipeIssues(issues, 'key', []).slots.get('addition')).toHaveLength(1);
  });

  it('requires exactly one source ingredient in transform recipes', () => {
    const recipe = createRecipe('shapeless_transform', 'r');
    recipe.ingredients = { A: diamond, B: { source: 'minecraft', id: 'STICK' } };
    expect(codes(recipe, 'craftengine')).toEqual(['recipe.sourceMissing']);
    recipe.ingredients.A = { ...diamond, options: { source: true } };
    expect(codes(recipe, 'craftengine')).toEqual([]);
    recipe.ingredients.B = { ...recipe.ingredients.B, options: { source: true } };
    expect(codes(recipe, 'craftengine')).toEqual(['recipe.sourceMultiple']);
  });

  it('needs the trim pattern under the key of the target, an error only for Nexo', () => {
    const recipe = withSlots('smithing_trim', diamond, diamond, diamond);
    expect(codes(recipe, 'nexo')).toEqual(['recipe.trimPatternMissing']);
    expect(validateRecipe(recipe, projectFor('craftengine'), 'key')[0].level).toBe('warning');
    recipe.options = { trim_pattern: 'minecraft:bolt' };
    expect(codes(recipe, 'nexo')).toEqual([]);
    recipe.options = { pattern: 'minecraft:bolt' };
    expect(codes(recipe, 'craftengine')).toEqual([]);
  });

  it('checks no result amount of a trim recipe', () => {
    const recipe = withSlots('smithing_trim', diamond, diamond, diamond);
    recipe.options = { trim_pattern: 'minecraft:bolt' };
    recipe.resultAmount = 0;
    expect(codes(recipe, 'nexo')).toEqual([]);
  });
});
