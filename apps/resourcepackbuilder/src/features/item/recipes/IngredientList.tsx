import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import type { Issue } from '@resourcepackbuilder/utils';
import type { Recipe } from '@resourcepackbuilder/core/project/recipes/model';
import {
  addIngredient,
  ingredientLetters,
  nextIngredientLetter,
  removeIngredient,
} from '@resourcepackbuilder/core/project/recipes/operations';
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
  return (
    <div className="flex flex-col gap-2">
      {ingredientLetters(recipe).map((letter) => (
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
              onClick={() => update((r) => removeIngredient(r, letter))}
            >
              <Trash2 />
            </IconButton>
          </div>
          <IssueList issues={issues.get(letter) ?? []} />
        </div>
      ))}
      {nextIngredientLetter(recipe) && (
        <Button variant="outline" size="sm" className="self-start" onClick={() => update((r) => void addIngredient(r))}>
          <Plus /> {t('recipes.addIngredient')}
        </Button>
      )}
    </div>
  );
}
