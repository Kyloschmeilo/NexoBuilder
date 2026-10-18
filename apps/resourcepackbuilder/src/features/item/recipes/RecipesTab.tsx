/**
 * The item's recipes: one card per recipe, an add menu with the recipe types the project's target reads, and for Nexo
 * the vanilla recipes the whole project disables (recipes/disabled_recipes.yml).
 */
import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';
import { type Item, recipeKeys, recipeTypesFor } from '@resourcepackbuilder/core/project';
import { DISABLED_RECIPES_FILE, NEXO_DISABLED_RECIPES_FIELD } from '@resourcepackbuilder/core/nexo';
import { findItemPlan, nexoPluginPath, packTargetFor } from '@resourcepackbuilder/export';
import { IconButton, SectionCard } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { richTags } from '../../../i18n/richTags';
import { addRecipe } from '../../../commands/items';
import { updateProjectSettings } from '../../../commands/settings';
import { AddMenuButton } from '../../../components/AddMenuButton';
import { FieldRenderer, toStringList } from '../../../components/editor';
import { Section } from '../../../components/Section';
import { usePlan } from '../../../shell/PlanProvider';
import { useOpenProject } from '../../../store/project';
import { useSchemaText } from '../../../components/useSchemaText';
import { RecipeCard } from './RecipeCard';

function AddRecipeButton({ itemId }: { itemId: string }) {
  const tCommon = useTranslations('common');
  const schemaText = useSchemaText();
  const project = useOpenProject();
  return (
    <AddMenuButton
      label={tCommon('add')}
      menuClassName="w-82"
      options={recipeTypesFor(project.target).map((type) => ({
        value: type.type,
        label: schemaText(type.label),
        description: schemaText(type.description),
      }))}
      onSelect={(type) => addRecipe(itemId, type)}
    />
  );
}

/** Nexo's project-wide list of vanilla recipes to disable. */
function DisabledRecipes() {
  const t = useTranslations('item');
  const project = useOpenProject();
  return (
    <SectionCard
      title={t('recipes.disabledTitle')}
      description={t.rich('recipes.disabledDescription', { ...richTags, path: nexoPluginPath(DISABLED_RECIPES_FILE) })}
      actions={
        <IconButton
          label={t('properties.docs.nexo')}
          nativeButton={false}
          render={<a href={NEXO_DISABLED_RECIPES_FIELD.docs} target="_blank" rel="noreferrer" />}
        >
          <ExternalLink />
        </IconButton>
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
    </SectionCard>
  );
}

/** The item's recipes of every kind the project's target reads. */
export function RecipesTab({ item }: { item: Item }) {
  const t = useTranslations('item');
  const project = useOpenProject();
  const plan = usePlan();
  const keys = recipeKeys(item);
  const { layout } = packTargetFor(project);
  // Nexo keeps recipes in files per type, CraftEngine in the item's own file
  const path =
    project.target === 'craftengine'
      ? `${layout.pluginDir}/${findItemPlan(plan, item.id)?.yamlFile ?? ''}`
      : nexoPluginPath(`recipes/<${t('recipes.typePlaceholder')}>/`);
  return (
    <div className="flex flex-col gap-4">
      <Section
        title={t('recipes.title')}
        actions={<AddRecipeButton itemId={item.id} />}
        empty={item.recipes.length === 0 && t.rich('recipes.empty', { b: (chunks) => <strong>{chunks}</strong> })}
      >
        {item.recipes.map((recipe) => (
          <RecipeCard key={recipe.id} item={item} recipe={recipe} recipeKey={keys.get(recipe.id) ?? recipe.type} />
        ))}
      </Section>
      <Alert variant="info">
        <AlertDescription>
          {t.rich('recipes.exportHint', {
            ...richTags,
            path,
            command: `/${layout.reloadCommand}`,
          })}
        </AlertDescription>
      </Alert>
      {project.target === 'nexo' && <DisabledRecipes />}
    </div>
  );
}
