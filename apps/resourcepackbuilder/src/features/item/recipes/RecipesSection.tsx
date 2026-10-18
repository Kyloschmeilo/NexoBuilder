/**
 * The Recipes section of the item editor: a panel with one collapsed row per recipe (type, a one-line summary of what
 * goes in, the recipe key, the type's docs link and its worst problem). One recipe is edited at a time: opening a row
 * closes the one that was open. "Add recipe" opens a catalog of the recipe types the project's target reads, and the
 * new recipe opens right away. Nexo projects get a second panel with the vanilla recipes the whole project disables
 * (recipes/disabled_recipes.yml).
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import {
  getRecipeTypeInfo,
  type Item,
  type Recipe,
  recipeIssues,
  recipeKeys,
  type RecipeType,
  recipeTypesFor,
} from '@resourcepackbuilder/core/project';
import { DISABLED_RECIPES_FILE, NEXO_DISABLED_RECIPES_FIELD, recipeFilePath } from '@resourcepackbuilder/core/nexo';
import { recipeDocsFor } from '@resourcepackbuilder/core/targets';
import { findItemPlan, nexoPluginPath, packTargetFor } from '@resourcepackbuilder/export';
import { issuesFor } from '@resourcepackbuilder/utils';
import { DocsLink, EmptyHint, type MenuEntry, Section } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { addRecipe, duplicateRecipe, moveRecipe, removeRecipe, updateRecipe } from '../../../commands/items';
import { updateProjectSettings } from '../../../commands/settings';
import { CatalogDialog } from '../../../components/catalog';
import { FieldRenderer, toStringList } from '../../../components/editor';
import { FeatureRow } from '../../../components/features';
import { useSchemaText } from '../../../components/useSchemaText';
import { usePlan } from '../../../shell/PlanProvider';
import { useOpenProject } from '../../../store/project';
import { recipeCatalog } from './catalog';
import { useWorstIssue } from './IssueLines';
import { RecipeEditor, type RecipeUpdater } from './RecipeEditor';
import { recipeSummary, type RecipeSummaryText } from './summary';

/** The anchor of the section in the item editor's section nav. */
export const RECIPES_SECTION_ID = 'recipes';

/** The file a recipe of the type is written to, relative to the server's plugins folder. */
function useRecipeFile(item: Item): (type: RecipeType) => string | undefined {
  const project = useOpenProject();
  const plan = usePlan();
  const { layout } = packTargetFor(project);
  if (project.target === 'craftengine') {
    // CraftEngine keeps an item's recipes in the item's own file
    const yamlFile = findItemPlan(plan, item.id)?.yamlFile;
    return () => (yamlFile ? `${layout.pluginDir}/${yamlFile}` : undefined);
  }
  return (type) => nexoPluginPath(recipeFilePath(project, type));
}

function useSummaryText(): RecipeSummaryText {
  const t = useTranslations('item.recipes.summary');
  return {
    empty: t('empty'),
    noIngredients: t('noIngredients'),
    seconds: (seconds) => t('seconds', { seconds }),
    makes: (amount) => t('makes', { amount }),
  };
}

interface RecipeRowProps {
  item: Item;
  recipe: Recipe;
  recipeKey: string;
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens the row of a recipe that was just created (the copy of a duplicate). */
  onCreated: (recipeId: string) => void;
  file: string | undefined;
}

/** One recipe as a feature row; its editor shows while it is open. */
function RecipeRow({ item, recipe, recipeKey, index, open, onOpenChange, onCreated, file }: RecipeRowProps) {
  const t = useTranslations('item');
  const tSchema = useSchemaText();
  const project = useOpenProject();
  const plan = usePlan();
  const summaryText = useSummaryText();
  const info = getRecipeTypeInfo(recipe.type);
  const issues = recipeIssues(
    plan ? issuesFor(plan.issues, { kind: 'item', id: item.id }) : [],
    recipeKey,
    Object.keys(recipe.ingredients),
  );
  const issue = useWorstIssue([
    ...issues.recipe,
    ...issues.input,
    ...[...issues.slots.values()].flat(),
    ...[...issues.ingredients.values()].flat(),
  ]);
  const update: RecipeUpdater = (change, historyKey) => updateRecipe(item.id, recipe.id, change, historyKey);
  const label = tSchema(info.label);
  const menu: MenuEntry[] = [
    {
      icon: <Copy />,
      label: t('recipes.duplicate'),
      onSelect: () => {
        const copy = duplicateRecipe(item.id, recipe.id);
        if (copy) onCreated(copy);
      },
    },
    { icon: <ArrowUp />, label: t('recipes.moveUp'), disabled: index === 0, onSelect: () => moveRecipe(item.id, recipe.id, -1) },
    {
      icon: <ArrowDown />,
      label: t('recipes.moveDown'),
      disabled: index === item.recipes.length - 1,
      onSelect: () => moveRecipe(item.id, recipe.id, 1),
    },
    'separator',
    { icon: <Trash2 />, label: t('recipes.remove'), destructive: true, onSelect: () => removeRecipe(item.id, recipe.id) },
  ];
  return (
    <FeatureRow
      featureId={recipe.id}
      label={label}
      summary={recipeSummary(recipe, project.target, summaryText)}
      yamlKey={recipeKey}
      docs={{ url: recipeDocsFor(project.target, recipe.type), target: project.target }}
      issue={issue}
      open={open}
      onOpenChange={onOpenChange}
      menu={menu}
    >
      <RecipeEditor item={item} recipe={recipe} update={update} issues={issues} file={file} />
    </FeatureRow>
  );
}

/** Nexo's project-wide list of vanilla recipes to disable, on a panel of its own. */
function DisabledRecipesSection() {
  const t = useTranslations('item');
  const project = useOpenProject();
  return (
    <Section
      id={`${RECIPES_SECTION_ID}-disabled`}
      title={t('recipes.disabledTitle')}
      description={t('recipes.disabledSummary', { path: nexoPluginPath(DISABLED_RECIPES_FILE) })}
      actions={
        NEXO_DISABLED_RECIPES_FIELD.docs && (
          <DocsLink url={NEXO_DISABLED_RECIPES_FIELD.docs} target="nexo" label={t('recipes.disabledTitle')} />
        )
      }
    >
      <FieldRenderer
        field={NEXO_DISABLED_RECIPES_FIELD}
        hideLabel
        value={project.settings.disabledRecipes}
        onChange={(value) =>
          updateProjectSettings((draft) => {
            const list = toStringList(value).filter((key) => key.trim());
            if (list.length > 0) draft.settings.disabledRecipes = list;
            else delete draft.settings.disabledRecipes;
          })
        }
      />
    </Section>
  );
}

/**
 * The item's recipes as a section of the item editor (mounted by `features/item/sections.ts`). It renders its own
 * `Section` panel with the anchor {@link RECIPES_SECTION_ID}, and for Nexo the disabled vanilla recipes below it.
 */
export function RecipesSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const tSchema = useSchemaText();
  const project = useOpenProject();
  const [openId, setOpenId] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const keys = recipeKeys(item);
  const fileOf = useRecipeFile(item);
  const { layout } = packTargetFor(project);
  const sectionPath =
    project.target === 'craftengine'
      ? (fileOf(item.recipes[0]?.type ?? 'shaped') ?? layout.pluginDir)
      : nexoPluginPath(`recipes/<${t('recipes.typePlaceholder')}>/`);
  const catalog = recipeCatalog(project.target, {
    schema: tSchema,
    category: (category) => t(`recipes.categories.${category}`),
    writtenTo: (type) => {
      const file = fileOf(type);
      return file && t('recipes.writtenTo', { path: file });
    },
  });

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Section
        id={RECIPES_SECTION_ID}
        title={t('recipes.title')}
        meta={item.recipes.length > 0 && <span className="text-meta text-text-muted tabular-nums">{item.recipes.length}</span>}
        description={t('recipes.sectionDescription', { path: sectionPath, command: `/${layout.reloadCommand}` })}
        actions={
          <Button variant="outline" size="sm" data-testid="add-recipe" onClick={() => setIsPicking(true)}>
            <Plus /> {t('recipes.addRecipe')}
          </Button>
        }
      >
        {item.recipes.length === 0 ? (
          <EmptyHint>{t('recipes.emptyHint')}</EmptyHint>
        ) : (
          // The rows reach the panel's edges, separated by hairlines, instead of sitting in a second box
          <div data-slot="recipe-list" className="-m-3 divide-y divide-line @xl/section:-m-4">
            {item.recipes.map((recipe, index) => (
              <RecipeRow
                key={recipe.id}
                item={item}
                recipe={recipe}
                recipeKey={keys.get(recipe.id) ?? recipe.type}
                index={index}
                open={openId === recipe.id}
                onOpenChange={(open) => setOpenId(open ? recipe.id : null)}
                onCreated={setOpenId}
                file={fileOf(recipe.type)}
              />
            ))}
          </div>
        )}
      </Section>
      {project.target === 'nexo' && <DisabledRecipesSection />}
      <CatalogDialog
        open={isPicking}
        onOpenChange={setIsPicking}
        title={t('recipes.catalogTitle')}
        description={t('recipes.catalogDescription')}
        searchPlaceholder={t('recipes.catalogSearch')}
        {...catalog}
        addLabel={t('recipes.addRecipe')}
        onAdd={(types) => {
          let added: string | null = null;
          for (const type of types) {
            const info = recipeTypesFor(project.target).find((entry) => entry.type === type);
            if (info) added = addRecipe(item.id, info.type);
          }
          if (added) setOpenId(added);
        }}
      />
    </div>
  );
}
