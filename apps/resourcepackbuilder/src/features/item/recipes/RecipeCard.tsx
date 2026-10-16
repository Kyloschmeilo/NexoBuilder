import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { getRecipeTypeInfo, MAX_RESULT_AMOUNT, type Recipe } from '@resourcepackbuilder/core/nexo/recipes/model';
import { recipeFilePath } from '@resourcepackbuilder/core/nexo/recipes/files';
import { validateRecipe } from '@resourcepackbuilder/core/nexo/recipes/validate';
import { IconButton, SectionCard, Tip } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Field, FieldDescription, FieldTitle } from '@resourcepackbuilder/ui/components/field';
import { removeRecipe, updateRecipe } from '../../../commands/items';
import { NumberInput } from '../../../components/editor';
import { IssueList } from '../../../components/IssueList';
import { useOpenProject } from '../../../store/project';
import { useSchemaText } from '../../../components/useSchemaText';
import { IngredientList } from './IngredientList';
import { IngredientRow } from './IngredientRow';
import { sortRecipeIssues } from './recipeIssues';
import { ShapedGrid } from './ShapedGrid';

/** Changes the recipe; equal history keys in quick succession form one undo step. */
export type RecipeUpdater = (recipe: (draft: Recipe) => void, historyKey?: string) => void;

const TICKS_PER_SECOND = 20;

interface RecipeCardProps {
  item: Item;
  recipe: Recipe;
  /** The recipe's unique key in the recipe file. */
  recipeKey: string;
}

/** One recipe of the item: its ingredients (by type), result amount and problems. */
export function RecipeCard({ item, recipe, recipeKey }: RecipeCardProps) {
  const t = useTranslations('item');
  const tSchema = useSchemaText();
  const project = useOpenProject();
  const info = getRecipeTypeInfo(recipe.type);
  const issues = sortRecipeIssues(validateRecipe(recipe, project, recipeKey), Object.keys(recipe.ingredients));
  const update: RecipeUpdater = (change, historyKey) => updateRecipe(item.id, recipe.id, change, historyKey);

  return (
    <SectionCard
      title={tSchema(info.label)}
      badges={
        <Tip label={t('recipes.key')}>
          <Badge variant="outline" className="font-mono">
            {recipeKey}
          </Badge>
        </Tip>
      }
      description={
        <>
          {tSchema(info.description)} {t('recipes.file')}{' '}
          <span className="font-mono break-all">{recipeFilePath(project, recipe.type)}</span>
        </>
      }
      actions={
        <IconButton label={t('recipes.remove')} variant="ghost-destructive" onClick={() => removeRecipe(item.id, recipe.id)}>
          <Trash2 />
        </IconButton>
      }
    >
      <div className="flex flex-col gap-4">
        {info.kind === 'shaped' && (
          <div className="grid gap-5 @3xl:grid-cols-[auto_minmax(0,1fr)] @3xl:items-start">
            <Field className="gap-1.5">
              <FieldTitle>{t('recipes.grid')}</FieldTitle>
              <ShapedGrid recipe={recipe} update={update} />
              <FieldDescription className="text-xs">{t('recipes.gridHelp')}</FieldDescription>
            </Field>
            <Field className="min-w-0 gap-1.5">
              <FieldTitle>{t('recipes.ingredients')}</FieldTitle>
              <IngredientList recipe={recipe} update={update} isShaped issues={issues.ingredients} />
            </Field>
          </div>
        )}
        {info.kind === 'shapeless' && (
          <Field className="gap-1.5">
            <FieldTitle>{t('recipes.shapelessIngredients')}</FieldTitle>
            <IngredientList recipe={recipe} update={update} isShaped={false} issues={issues.ingredients} />
          </Field>
        )}
        {(info.kind === 'cooking' || info.kind === 'stonecutting') && (
          <Field className="gap-1.5">
            <FieldTitle>{t('recipes.input')}</FieldTitle>
            <IngredientRow
              value={recipe.input ?? { source: 'minecraft', id: '' }}
              onChange={(input) =>
                update((r) => {
                  r.input = input;
                }, `${recipe.id}:input`)
              }
            />
            <IssueList issues={issues.input} />
          </Field>
        )}
        {info.kind === 'cooking' && (
          <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2">
            <Field className="gap-1.5">
              <FieldTitle>{t('recipes.cookingTime', { seconds: recipe.cookingTime / TICKS_PER_SECOND })}</FieldTitle>
              <NumberInput
                value={recipe.cookingTime}
                integer
                min={1}
                onChange={(ticks) =>
                  update((r) => {
                    r.cookingTime = ticks ?? 0;
                  }, `${recipe.id}:time`)
                }
              />
            </Field>
            <Field className="gap-1.5">
              <FieldTitle>{t('recipes.experience')}</FieldTitle>
              <NumberInput
                value={recipe.experience}
                min={0}
                onChange={(experience) =>
                  update((r) => {
                    r.experience = experience ?? 0;
                  }, `${recipe.id}:xp`)
                }
              />
            </Field>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-sm font-medium">{t('recipes.result')}</span>
          <NumberInput
            className="w-20"
            value={recipe.resultAmount}
            integer
            min={1}
            max={MAX_RESULT_AMOUNT}
            onChange={(amount) =>
              update((r) => {
                r.resultAmount = amount ?? 1;
              }, `${recipe.id}:amount`)
            }
          />
          <span className="min-w-0 font-mono break-all text-muted-foreground">× {item.nexoId}</span>
        </div>
        <IssueList issues={issues.recipe} />
      </div>
    </SectionCard>
  );
}
