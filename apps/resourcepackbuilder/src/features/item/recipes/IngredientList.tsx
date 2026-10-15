import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import type { Issue } from '@resourcepackbuilder/core/issues';
import { INGREDIENT_LETTERS, type Recipe } from '@resourcepackbuilder/core/nexo/recipes/model';
import { IconButton } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { IssueList } from '../../../components/IssueList';
import { IngredientRow } from './IngredientRow';
import type { RecipeUpdater } from './RecipeCard';

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
  const letters = INGREDIENT_LETTERS.filter((letter) => recipe.ingredients[letter]);
  const nextLetter = INGREDIENT_LETTERS.find((letter) => !recipe.ingredients[letter]);
  return (
    <div className="flex flex-col gap-2">
      {letters.map((letter) => (
        <div key={letter} className="flex flex-col gap-1.5">
          <div className="flex items-start gap-2">
            {isShaped && (
              <Badge variant="outline" className="h-8 w-7 shrink-0 border-primary bg-primary/10 font-mono text-primary">
                {letter}
              </Badge>
            )}
            <div className="min-w-0 flex-1">
              <IngredientRow
                value={recipe.ingredients[letter]}
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
              onClick={() =>
                update((r) => {
                  delete r.ingredients[letter];
                  if (isShaped) r.grid = r.grid.map((slot) => (slot === letter ? '' : slot));
                })
              }
            >
              <Trash2 />
            </IconButton>
          </div>
          <IssueList issues={issues.get(letter) ?? []} />
        </div>
      ))}
      {nextLetter && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() =>
            update((r) => {
              r.ingredients[nextLetter] = { source: 'minecraft', id: '' };
            })
          }
        >
          <Plus /> {t('recipes.addIngredient')}
        </Button>
      )}
    </div>
  );
}
