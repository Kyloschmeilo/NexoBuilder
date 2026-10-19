/**
 * The ingredients of a crafting recipe: one row per ingredient (its grid letter for shaped recipes, source, id,
 * amount and further options), its problems as short lines, and a button for one more, up to nine.
 */
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import type { Issue } from '@resourcepackbuilder/utils';
import { addIngredient, ingredientLetters, nextIngredientLetter, type Recipe, removeIngredient } from '@resourcepackbuilder/core/project';
import { IconButton } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { IngredientRow } from './IngredientRow';
import { IssueLines } from './IssueLines';
import type { RecipeUpdater } from './RecipeEditor';

interface IngredientListProps {
  recipe: Recipe;
  update: RecipeUpdater;
  /** Shaped recipes show the letters the grid refers to. */
  isShaped: boolean;
  issues: Map<string, Issue[]>;
}

/** The ingredients of a shaped or shapeless recipe, each with its problems, and a button for one more. */
export function IngredientList({ recipe, update, isShaped, issues }: IngredientListProps) {
  const t = useTranslations('item');
  return (
    <div data-slot="ingredient-list" className="flex min-w-0 flex-col gap-3">
      {ingredientLetters(recipe).map((letter) => (
        <div key={letter} className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-start gap-2">
            {isShaped && (
              <span
                aria-hidden
                className="grid h-7.5 w-7 flex-none place-items-center rounded-lg border border-primary/40 bg-primary/10 font-mono text-label font-semibold text-primary"
              >
                {letter}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <IngredientRow
                value={recipe.ingredients[letter]}
                recipeType={recipe.type}
                onChange={(ingredient) =>
                  update((r) => {
                    r.ingredients[letter] = ingredient;
                  }, `${recipe.id}:${letter}`)
                }
              />
            </div>
            <IconButton
              label={t('recipes.removeIngredient')}
              variant="ghost-destructive"
              onClick={() => update((r) => removeIngredient(r, letter))}
            >
              <Trash2 />
            </IconButton>
          </div>
          <IssueLines issues={issues.get(letter) ?? []} className={isShaped ? 'pl-9' : undefined} />
        </div>
      ))}
      {nextIngredientLetter(recipe) && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start text-primary hover:text-primary"
          onClick={() => update((r) => void addIngredient(r))}
        >
          <Plus /> {t('recipes.addIngredient')}
        </Button>
      )}
    </div>
  );
}
