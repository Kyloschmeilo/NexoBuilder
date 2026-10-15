import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from 'cn';
import type { Item } from '@resourcepackbuilder/core/project/types';
import {
  createRecipe,
  getRecipeTypeInfo,
  INGREDIENT_LETTERS,
  INGREDIENT_SOURCES,
  RECIPE_TYPES,
  type IngredientSource,
  type Recipe,
  type RecipeIngredient,
  type RecipeType,
} from '@resourcepackbuilder/core/nexo/recipes/model';
import { recipeFilePath, recipeKeys } from '@resourcepackbuilder/core/nexo/recipes/files';
import { validateRecipe } from '@resourcepackbuilder/core/nexo/recipes/validate';
import { CRAFTING_MATERIALS, ITEM_TAGS } from '@resourcepackbuilder/core/nexo/options';
import { uid } from '@resourcepackbuilder/core/project/ids';
import { itemLabel } from '@resourcepackbuilder/core/project/labels';
import { Tip } from '@resourcepackbuilder/ui';
import { updateItem } from '../../commands/items';
import { NumberInput, TextInput, type Choice } from '../../components/editor';
import { IssueList } from '../../components/IssueList';
import { useOpenProject } from '../../store/project';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@resourcepackbuilder/ui/components/dropdown-menu';
import { Field, FieldDescription, FieldTitle } from '@resourcepackbuilder/ui/components/field';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { EditorCard, EmptyCard } from './EditorCard';
import { EditorHint } from './EditorHint';
import { SectionTitle } from './SectionTitle';

const codeClass = 'rounded-sm bg-muted px-1 py-0.5 font-mono text-[12px] text-foreground';

export function RecipesTab({ item }: { item: Item }) {
  const t = useTranslations('item');
  const tSchema = useTranslations('schema');
  const project = useOpenProject();
  const recipes = item.recipes;
  const keys = recipeKeys(item);

  const update = (recipeId: string, recipe: (r: Recipe) => void, historyKey = recipeId) =>
    updateItem(
      item.id,
      (d) => {
        const r = d.recipes.find((x) => x.id === recipeId);
        if (r) recipe(r);
      },
      `recipe:${historyKey}`,
    );

  return (
    <div>
      <SectionTitle
        actions={<AddRecipeButton onAdd={(type) => updateItem(item.id, (d) => d.recipes.push(createRecipe(type, uid('r_'))))} />}
      >
        {t('recipes.title')}
      </SectionTitle>
      {recipes.length === 0 && <EmptyCard>{t.rich('recipes.empty', { b: (chunks) => <strong>{chunks}</strong> })}</EmptyCard>}
      {recipes.map((recipe) => {
        const key = keys.get(recipe.id) ?? recipe.type;
        const info = getRecipeTypeInfo(recipe.type);
        const issues = validateRecipe(recipe, project, key);
        return (
          <EditorCard
            key={recipe.id}
            title={tSchema(info.label as never)}
            badges={
              <Tip label={t('recipes.key')}>
                <Badge variant="outline" className="font-mono">
                  {key}
                </Badge>
              </Tip>
            }
            description={
              <>
                {tSchema(info.description as never)} {t('recipes.file')}{' '}
                <span className="font-mono">{recipeFilePath(project, recipe.type)}</span>
              </>
            }
            actions={
              <Tip label={t('recipes.remove')}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  aria-label={t('recipes.remove')}
                  onClick={() => updateItem(item.id, (d) => (d.recipes = d.recipes.filter((r) => r.id !== recipe.id)))}
                >
                  <Trash2 />
                </Button>
              </Tip>
            }
          >
            {info.kind === 'shaped' && <ShapedEditor recipe={recipe} update={(fn, k) => update(recipe.id, fn, k)} />}
            {info.kind === 'shapeless' && <ShapelessEditor recipe={recipe} update={(fn, k) => update(recipe.id, fn, k)} />}
            {(info.kind === 'cooking' || info.kind === 'stonecutting') && (
              <div className="flex flex-col gap-3">
                <Field className="gap-1.5">
                  <FieldTitle>{t('recipes.input')}</FieldTitle>
                  <IngredientRow
                    value={recipe.input ?? { source: 'minecraft', id: '' }}
                    onChange={(ing) => update(recipe.id, (r) => (r.input = ing), `${recipe.id}:input`)}
                  />
                </Field>
                {info.kind === 'cooking' && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field className="gap-1.5">
                      <FieldTitle>{t('recipes.cookingTime', { seconds: recipe.cookingTime / 20 })}</FieldTitle>
                      <NumberInput
                        value={recipe.cookingTime}
                        integer
                        min={1}
                        onChange={(v) => update(recipe.id, (r) => (r.cookingTime = v ?? 0), `${recipe.id}:time`)}
                      />
                    </Field>
                    <Field className="gap-1.5">
                      <FieldTitle>{t('recipes.experience')}</FieldTitle>
                      <NumberInput
                        value={recipe.experience}
                        min={0}
                        onChange={(v) => update(recipe.id, (r) => (r.experience = v ?? 0), `${recipe.id}:xp`)}
                      />
                    </Field>
                  </div>
                )}
              </div>
            )}
            <div className="mt-3.5 flex items-center gap-2.5">
              <span className="text-sm font-medium">{t('recipes.result')}</span>
              <div className="w-20">
                <NumberInput
                  value={recipe.resultAmount}
                  integer
                  min={1}
                  max={99}
                  onChange={(v) => update(recipe.id, (r) => (r.resultAmount = v ?? 1), `${recipe.id}:amount`)}
                />
              </div>
              <span className="text-muted-foreground">
                × {item.displayName ? <span className="font-mono">{item.nexoId}</span> : item.nexoId}
              </span>
            </div>
            {issues.length > 0 && (
              <div className="mt-3">
                <IssueList issues={issues} />
              </div>
            )}
          </EditorCard>
        );
      })}
      <EditorHint>
        {t.rich('recipes.exportHint', {
          path: `plugins/Nexo/recipes/<${t('recipes.typePlaceholder')}>/`,
          command: '/nexo reload all',
          code: (chunks) => <code className={codeClass}>{chunks}</code>,
        })}
      </EditorHint>
    </div>
  );
}

function AddRecipeButton({ onAdd }: { onAdd: (type: RecipeType) => void }) {
  const tCommon = useTranslations('common');
  const tSchema = useTranslations('schema');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" />}>
        <Plus /> {tCommon('add')}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[330px]">
        {RECIPE_TYPES.map((type) => (
          <DropdownMenuItem key={type.type} className="flex-col items-start gap-0.5" onClick={() => onAdd(type.type)}>
            <span className="font-medium">{tSchema(type.label as never)}</span>
            <span className="text-xs text-muted-foreground">{tSchema(type.description as never)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type Updater = (fn: (r: Recipe) => void, historyKey?: string) => void;

function ingredientLabel(ing: RecipeIngredient | undefined, emptyLabel: string): string {
  if (!ing?.id) return emptyLabel;
  const prefix = ing.source === 'nexo' ? 'Nexo: ' : ing.source === 'tag' ? '#' : '';
  return `${prefix}${ing.id}${ing.amount && ing.amount > 1 ? ` ×${ing.amount}` : ''}`;
}

function IngredientList({ recipe, update, shaped }: { recipe: Recipe; update: Updater; shaped: boolean }) {
  const t = useTranslations('item');
  const letters = INGREDIENT_LETTERS.filter((l) => recipe.ingredients[l]);
  const nextLetter = INGREDIENT_LETTERS.find((l) => !recipe.ingredients[l]);
  return (
    <div className="flex flex-col gap-2">
      {letters.map((letter) => (
        <div key={letter} className="flex items-start gap-2">
          {shaped && (
            <Badge variant="outline" className="h-8 w-7 shrink-0 border-primary bg-primary/10 font-mono text-primary">
              {letter}
            </Badge>
          )}
          <div className="min-w-0 flex-1">
            <IngredientRow
              value={recipe.ingredients[letter]}
              onChange={(ing) => update((r) => (r.ingredients[letter] = ing), `${recipe.id}:${letter}`)}
            />
          </div>
          <Tip label={t('recipes.removeIngredient')}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              aria-label={t('recipes.removeIngredient')}
              onClick={() =>
                update((r) => {
                  delete r.ingredients[letter];
                  if (shaped) r.grid = r.grid.map((s) => (s === letter ? '' : s));
                })
              }
            >
              <Trash2 />
            </Button>
          </Tip>
        </div>
      ))}
      {nextLetter && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => update((r) => (r.ingredients[nextLetter] = { source: 'minecraft', id: '' }))}
        >
          <Plus /> {t('recipes.addIngredient')}
        </Button>
      )}
    </div>
  );
}

function ShapedEditor({ recipe, update }: { recipe: Recipe; update: Updater }) {
  const t = useTranslations('item');
  const letters = INGREDIENT_LETTERS.filter((l) => recipe.ingredients[l]);
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-5">
      <Field className="gap-1.5">
        <FieldTitle>{t('recipes.grid')}</FieldTitle>
        <div className="grid grid-cols-[repeat(3,96px)] gap-1.5">
          {recipe.grid.map((slot, i) => (
            <Tip key={i} label={slot ? ingredientLabel(recipe.ingredients[slot], t('recipes.emptyIngredient')) : t('recipes.emptySlot')}>
              <NativeSelect
                className={cn(
                  'w-full [&_select]:h-14 [&_select]:pl-8 [&_select]:text-center [&_select]:text-[15px] [&_select]:font-bold',
                  slot && '[&_select]:bg-primary/10',
                )}
                value={slot}
                aria-label={t('recipes.grid')}
                onChange={(e) => update((r) => (r.grid[i] = e.target.value), `${recipe.id}:grid`)}
              >
                <NativeSelectOption value="">–</NativeSelectOption>
                {letters.map((l) => (
                  <NativeSelectOption key={l} value={l}>
                    {l}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Tip>
          ))}
        </div>
        <FieldDescription className="text-xs">{t('recipes.gridHelp')}</FieldDescription>
      </Field>
      <Field className="gap-1.5">
        <FieldTitle>{t('recipes.ingredients')}</FieldTitle>
        <IngredientList recipe={recipe} update={update} shaped />
      </Field>
    </div>
  );
}

function ShapelessEditor({ recipe, update }: { recipe: Recipe; update: Updater }) {
  const t = useTranslations('item');
  return (
    <Field className="gap-1.5">
      <FieldTitle>{t('recipes.shapelessIngredients')}</FieldTitle>
      <IngredientList recipe={recipe} update={update} shaped={false} />
    </Field>
  );
}

function IngredientRow({ value, onChange }: { value: RecipeIngredient; onChange: (v: RecipeIngredient) => void }) {
  const t = useTranslations('item');
  const tSchema = useTranslations('schema');
  const project = useOpenProject();
  const nexoItems = useMemo<Choice[]>(
    () => Object.values(project.items).map((i) => ({ value: i.nexoId, text: itemLabel(i) })),
    [project.items],
  );
  const suggestions = value.source === 'minecraft' ? CRAFTING_MATERIALS : value.source === 'nexo' ? nexoItems : ITEM_TAGS;
  return (
    <div className="flex items-center gap-1.5">
      <NativeSelect
        className="w-[150px] flex-none"
        value={value.source}
        onChange={(e) => onChange({ ...value, source: e.target.value as IngredientSource })}
      >
        {INGREDIENT_SOURCES.map((s) => (
          <NativeSelectOption key={s.value} value={s.value}>
            {tSchema(s.label as never)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <div className="min-w-0 flex-1">
        <TextInput
          value={value.id}
          mono
          suggestions={suggestions}
          placeholder={
            value.source === 'minecraft'
              ? t('recipes.placeholderMinecraft')
              : value.source === 'nexo'
                ? t('recipes.placeholderNexo')
                : t('recipes.placeholderTag')
          }
          onChange={(v) => onChange({ ...value, id: value.source === 'minecraft' ? (v ?? '').toUpperCase() : (v ?? '') })}
        />
      </div>
      <Tip label={t('recipes.amount')}>
        <div className="w-[70px] flex-none">
          <NumberInput
            value={value.amount}
            integer
            min={1}
            max={64}
            placeholder="1×"
            onChange={(v) => {
              const next = { ...value };
              if (v && v > 1) next.amount = v;
              else delete next.amount;
              onChange(next);
            }}
          />
        </div>
      </Tip>
    </div>
  );
}
