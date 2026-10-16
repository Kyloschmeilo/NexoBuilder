import { describe, expect, it } from 'vitest';
import { planExport } from './plan';
import { recipeFrame, recipeIngredientFrame, recipeInputFrame } from '@resourcepackbuilder/core/project/issueFrames';
import { issuesFor, type Issue, type IssueCode, type IssueContext } from '@resourcepackbuilder/utils';
import { createFolder, createItem, createProject, insertFolder, insertItem } from '@resourcepackbuilder/core/project/factory';
import { recipeIssues } from '@resourcepackbuilder/core/nexo/recipes/issues';
import { createRecipe, emptyIngredient } from '@resourcepackbuilder/core/project/recipes/model';
import {
  addIngredient,
  ingredientLetters,
  nextIngredientLetter,
  removeIngredient,
  withIngredientAmount,
  withIngredientId,
} from '@resourcepackbuilder/core/project/recipes/operations';

const issue = (code: IssueCode, context?: Issue['context']): Issue => ({ level: 'error', code, context });
const itemFrame: IssueContext = { code: 'context.item', args: { item: 'Ruby' } };

describe('recipe issues', () => {
  it('sorts the issues of one recipe to the recipe, its input and its ingredients without frames', () => {
    const sorted = recipeIssues(
      [
        issue('recipe.gridEmpty', [itemFrame, recipeFrame('r')]),
        issue('recipe.ingredientMissing', [itemFrame, recipeInputFrame('r')]),
        issue('recipe.materialInvalid', [itemFrame, recipeIngredientFrame('r', 'A')]),
        issue('recipe.gridEmpty', [itemFrame, recipeFrame('other')]),
        issue('recipe.gridEmpty', [itemFrame]),
      ],
      'r',
      ['A'],
    );
    expect(sorted.recipe).toEqual([issue('recipe.gridEmpty')]);
    expect(sorted.input).toEqual([issue('recipe.ingredientMissing')]);
    expect(sorted.ingredients.get('A')).toEqual([issue('recipe.materialInvalid')]);
  });

  it('keeps issues of letters without an ingredient row with the recipe, recipe frame included', () => {
    const frame = recipeIngredientFrame('r', 'B');
    expect(recipeIssues([issue('recipe.ingredientMissing', [itemFrame, frame])], 'r', ['A']).recipe).toEqual([
      issue('recipe.ingredientMissing', [frame]),
    ]);
  });

  it('finds the recipe issues in the export plan', () => {
    const project = createProject('Test');
    const folder = createFolder('F', null);
    insertFolder(project, folder);
    const item = createItem({ displayName: 'Ruby', nexoId: 'ruby', folderId: folder.id, model: null });
    item.recipes.push(createRecipe('shaped', 'r_1'));
    insertItem(project, item);
    const plan = planExport(project);
    const sorted = recipeIssues(issuesFor(plan.issues, { kind: 'item', id: item.id }), 'ruby_shaped', ['A']);
    expect(sorted.recipe.map((i) => i.code)).toContain('recipe.gridEmpty');
  });
});

describe('recipe operations', () => {
  it('adds ingredients under the next free letter until all are taken', () => {
    const recipe = createRecipe('shaped', 'r');
    expect(ingredientLetters(recipe)).toEqual(['A']);
    expect(addIngredient(recipe)).toBe('B');
    expect(recipe.ingredients.B).toEqual(emptyIngredient());
    for (let i = 0; i < 7; i++) addIngredient(recipe);
    expect(nextIngredientLetter(recipe)).toBeUndefined();
    expect(addIngredient(recipe)).toBeUndefined();
  });

  it('removes an ingredient and clears its grid slots', () => {
    const recipe = createRecipe('shaped', 'r');
    addIngredient(recipe);
    recipe.grid = ['A', 'B', 'A', '', '', '', '', '', ''];
    removeIngredient(recipe, 'A');
    expect(recipe.ingredients.A).toBeUndefined();
    expect(recipe.grid.slice(0, 3)).toEqual(['', 'B', '']);
    expect(nextIngredientLetter(recipe)).toBe('A');
  });

  it('upper-cases Minecraft materials and stores only amounts above one', () => {
    expect(withIngredientId(emptyIngredient(), 'diamond').id).toBe('DIAMOND');
    expect(withIngredientId({ source: 'nexo', id: '' }, 'ruby').id).toBe('ruby');
    const ingredient = withIngredientAmount(emptyIngredient(), 3);
    expect(ingredient.amount).toBe(3);
    expect('amount' in withIngredientAmount(ingredient, 1)).toBe(false);
    expect('amount' in withIngredientAmount(ingredient, undefined)).toBe(false);
  });
});
