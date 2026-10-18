/**
 * The expanded editor of one recipe, laid out like its station: the visual crafting grid next to the result for shaped
 * recipes, the ingredient list for shapeless ones, and for the other types a line of their slots (smithing template +
 * base + addition, brewing bottle + ingredient, anvil and transmute input + material …) with one field per slot below.
 * Cooking types add time and experience. The keys the project's target reads for the type follow: those that belong
 * to the type right away, the shared ones under "More options", CraftEngine Premium keys under a disclosure of their
 * own. Problems show as short lines where they belong, and a last muted line names the file the recipe is written to.
 */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import {
  emptyIngredient,
  getRecipeTypeInfo,
  isRecipeTypeAvailable,
  isSlotOptional,
  type Item,
  optionsForType,
  type Recipe,
  type RecipeIssues,
  type RecipeOption,
  recipeSlot,
  recipeSlotHelp,
  recipeSlotLabel,
  type RecipeSlot,
  setRecipeSlot,
  TICKS_PER_SECOND,
} from '@resourcepackbuilder/core/project';
import { RECIPE_SECTION_LABELS, recipeOptionsFor } from '@resourcepackbuilder/core/targets';
import { FieldGroup, FieldRow, Help, MoreOptions } from '@resourcepackbuilder/ui';
import { FieldRenderer, NumberInput } from '../../../components/editor';
import { useOpenProject } from '../../../store/project';
import { useSchemaText } from '../../../components/useSchemaText';
import { IngredientList } from './IngredientList';
import { IngredientRow } from './IngredientRow';
import { IssueLines, NoteLine, useFieldMessages } from './IssueLines';
import { flatOptionsField, groupRecipeOptions, mergeOptionKeys, pickOptionKeys } from './options';
import { RecipeFlow, ResultTile } from './RecipeFlow';
import { ShapedGrid } from './ShapedGrid';
import { ingredientName } from './summary';

/** Changes the recipe; equal history keys in quick succession form one undo step. */
export type RecipeUpdater = (recipe: (draft: Recipe) => void, historyKey?: string) => void;

interface RecipeEditorProps {
  item: Item;
  recipe: Recipe;
  update: RecipeUpdater;
  /** The recipe's problems, sorted to its parts. */
  issues: RecipeIssues;
  /** The file the recipe is written to, relative to the plugin folder. */
  file: string | undefined;
}

/** One group of the target's recipe keys as fields; it edits only its own keys and keeps every other stored key. */
function OptionFields({
  recipe,
  update,
  options,
  label,
  historyKey,
}: {
  recipe: Recipe;
  update: RecipeUpdater;
  options: RecipeOption[];
  label: string;
  historyKey: string;
}) {
  return (
    <FieldRenderer
      field={flatOptionsField(options, label)}
      root
      hideLabel
      value={pickOptionKeys(recipe.options, options)}
      onChange={(next) =>
        update((r) => {
          const merged = mergeOptionKeys(r.options, options, next);
          if (merged) r.options = merged;
          else delete r.options;
        }, `${recipe.id}:${historyKey}`)
      }
    />
  );
}

/** A single-ingredient slot as a field row: name, help in the ⓘ popover, the ingredient inputs and its problems. */
function SlotField({ recipe, slot, update, issues }: { recipe: Recipe; slot: RecipeSlot; update: RecipeUpdater; issues: RecipeIssues }) {
  const t = useTranslations('item');
  const tSchema = useSchemaText();
  const project = useOpenProject();
  const messages = useFieldMessages(slot === 'input' ? issues.input : (issues.slots.get(slot) ?? []));
  return (
    <FieldRow
      // The label stays beside the ingredient inputs, not centred against its folded options
      className="*:items-start"
      label={tSchema(recipeSlotLabel(slot))}
      help={tSchema(recipeSlotHelp(slot))}
      badges={
        isSlotOptional(recipe.type, slot, project.target) && <span className="text-meta text-text-muted">{t('recipes.optional')}</span>
      }
      {...messages}
    >
      <IngredientRow
        value={recipeSlot(recipe, slot) ?? emptyIngredient()}
        recipeType={recipe.type}
        onChange={(ingredient) => update((r) => setRecipeSlot(r, slot, ingredient), `${recipe.id}:${slot}`)}
      />
    </FieldRow>
  );
}

/** The editor of a recipe, shown in its expanded row. */
export function RecipeEditor({ item, recipe, update, issues, file }: RecipeEditorProps) {
  const t = useTranslations('item');
  const tSchema = useSchemaText();
  const project = useOpenProject();
  const info = getRecipeTypeInfo(recipe.type);
  const isAvailable = isRecipeTypeAvailable(recipe.type, project.target);
  const groups = groupRecipeOptions(optionsForType(recipeOptionsFor(project.target).recipe, recipe.type));
  const result = info.hasResult && (
    <ResultTile
      amount={recipe.resultAmount}
      itemId={item.itemId}
      onAmountChange={(amount) =>
        update((r) => {
          r.resultAmount = amount;
        }, `${recipe.id}:amount`)
      }
    />
  );
  const hasValue = (options: RecipeOption[]) => Object.keys(pickOptionKeys(recipe.options, options)).length > 0;

  return (
    <div data-slot="recipe-editor" className="flex min-w-0 flex-col gap-4">
      {!isAvailable && <NoteLine tone="warning">{t(`recipes.unsupported.${project.target}`)}</NoteLine>}

      {info.kind === 'shaped' && (
        <>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1 text-label font-medium text-text">
              {t('recipes.grid')}
              <Help>{t('recipes.gridHelp')}</Help>
            </div>
            <RecipeFlowGrid recipe={recipe} update={update} result={result} />
          </div>
          <FieldRow label={t('recipes.ingredients')} layout="stacked">
            <IngredientList recipe={recipe} update={update} isShaped issues={issues.ingredients} />
          </FieldRow>
        </>
      )}

      {info.kind === 'shapeless' && (
        <>
          <FieldRow label={t('recipes.shapelessIngredients')} layout="stacked">
            <IngredientList recipe={recipe} update={update} isShaped={false} issues={issues.ingredients} />
          </FieldRow>
          {result && <div className="flex">{result}</div>}
        </>
      )}

      {(info.kind === 'cooking' || info.kind === 'slots') && (
        <>
          <RecipeFlow
            slots={info.slots.map((slot) => ({ label: tSchema(recipeSlotLabel(slot)), value: ingredientName(recipeSlot(recipe, slot)) }))}
            result={result || undefined}
          />
          <FieldGroup>
            {info.slots.map((slot) => (
              <SlotField key={slot} recipe={recipe} slot={slot} update={update} issues={issues} />
            ))}
          </FieldGroup>
        </>
      )}

      {info.kind === 'cooking' && (
        <FieldGroup columns={2}>
          <FieldRow label={t('recipes.cookingTimeLabel')} help={t('recipes.cookingTimeHelp')} layout="stacked">
            <div className="flex items-center gap-2">
              <NumberInput
                className="w-28"
                label={t('recipes.cookingTimeLabel')}
                value={recipe.cookingTime}
                integer
                min={1}
                onChange={(ticks) =>
                  update((r) => {
                    r.cookingTime = ticks ?? 0;
                  }, `${recipe.id}:time`)
                }
              />
              <span className="text-meta text-text-muted tabular-nums">
                {t('recipes.summary.seconds', { seconds: recipe.cookingTime / TICKS_PER_SECOND })}
              </span>
            </div>
          </FieldRow>
          <FieldRow label={t('recipes.experience')} layout="stacked">
            <NumberInput
              className="w-28"
              label={t('recipes.experience')}
              value={recipe.experience}
              min={0}
              onChange={(experience) =>
                update((r) => {
                  r.experience = experience ?? 0;
                }, `${recipe.id}:xp`)
              }
            />
          </FieldRow>
        </FieldGroup>
      )}

      {!info.hasResult && <p className="m-0 text-meta text-text-muted">{t('recipes.noResult')}</p>}

      {groups.primary.length > 0 && (
        <OptionFields
          recipe={recipe}
          update={update}
          options={groups.primary}
          label={tSchema(RECIPE_SECTION_LABELS.options)}
          historyKey="options"
        />
      )}
      {(groups.more.length > 0 || groups.premium.length > 0) && (
        <div className="flex flex-col gap-2">
          {groups.more.length > 0 && (
            <MoreOptions count={groups.more.length} hasValue={hasValue(groups.more)}>
              <OptionFields
                recipe={recipe}
                update={update}
                options={groups.more}
                label={tSchema(RECIPE_SECTION_LABELS.options)}
                historyKey="more"
              />
            </MoreOptions>
          )}
          {groups.premium.length > 0 && (
            <MoreOptions label={tSchema(RECIPE_SECTION_LABELS.premium)} count={groups.premium.length} hasValue={hasValue(groups.premium)}>
              <OptionFields
                recipe={recipe}
                update={update}
                options={groups.premium}
                label={tSchema(RECIPE_SECTION_LABELS.premium)}
                historyKey="premium"
              />
            </MoreOptions>
          )}
        </div>
      )}

      <IssueLines issues={issues.recipe} />
      {file && (
        <p className="m-0 truncate text-meta text-text-muted" title={file}>
          {t('recipes.writtenTo', { path: file })}
        </p>
      )}
    </div>
  );
}

/** The crafting grid with an arrow to the result, like the crafting table. */
function RecipeFlowGrid({ recipe, update, result }: { recipe: Recipe; update: RecipeUpdater; result: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ShapedGrid recipe={recipe} update={update} />
      {result && (
        <>
          <ArrowRight className="size-4 flex-none text-text-faint" aria-hidden />
          {result}
        </>
      )}
    </div>
  );
}
