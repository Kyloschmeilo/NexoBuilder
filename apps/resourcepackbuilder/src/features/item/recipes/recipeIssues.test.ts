import { describe, expect, it } from 'vitest';
import type { Issue } from '@resourcepackbuilder/core/issues';
import { sortRecipeIssues } from './recipeIssues';

const issue = (code: string, frame?: Issue['context']): Issue => ({ level: 'error', code, context: frame });

describe('sortRecipeIssues', () => {
  it('sorts issues to the recipe, its input and its ingredients without their context frame', () => {
    const sorted = sortRecipeIssues(
      [
        issue('recipe.gridEmpty', [{ code: 'context.recipe', args: { recipe: 'r' } }]),
        issue('recipe.ingredientMissing', [{ code: 'context.recipeInput', args: { recipe: 'r' } }]),
        issue('recipe.materialInvalid', [{ code: 'context.recipeIngredient', args: { recipe: 'r', letter: 'A' } }]),
      ],
      ['A'],
    );
    expect(sorted.recipe).toEqual([issue('recipe.gridEmpty')]);
    expect(sorted.input).toEqual([issue('recipe.ingredientMissing')]);
    expect(sorted.ingredients.get('A')).toEqual([issue('recipe.materialInvalid')]);
  });

  it('keeps issues of letters without an ingredient row with the recipe, frame included', () => {
    const orphan = issue('recipe.ingredientMissing', [{ code: 'context.recipeIngredient', args: { recipe: 'r', letter: 'B' } }]);
    expect(sortRecipeIssues([orphan], ['A']).recipe).toEqual([orphan]);
  });
});
