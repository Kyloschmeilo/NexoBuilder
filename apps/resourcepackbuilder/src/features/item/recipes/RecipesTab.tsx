import { useTranslations } from 'next-intl';
import { type Item, RECIPE_TYPES } from '@resourcepackbuilder/core/project';
import { recipeKeys } from '@resourcepackbuilder/core/nexo';
import { NEXO_RELOAD_COMMAND, nexoPluginPath } from '@resourcepackbuilder/export';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { richTags } from '../../../i18n/richTags';
import { addRecipe } from '../../../commands/items';
import { AddMenuButton } from '../../../components/AddMenuButton';
import { Section } from '../../../components/Section';
import { useSchemaText } from '../../../components/useSchemaText';
import { RecipeCard } from './RecipeCard';

function AddRecipeButton({ itemId }: { itemId: string }) {
  const tCommon = useTranslations('common');
  const schemaText = useSchemaText();
  return (
    <AddMenuButton
      label={tCommon('add')}
      menuClassName="w-82"
      options={RECIPE_TYPES.map((type) => ({ value: type.type, label: schemaText(type.label), description: schemaText(type.description) }))}
      onSelect={(type) => addRecipe(itemId, type)}
    />
  );
}

/** The item's crafting, cooking and stonecutting recipes. */
export function RecipesTab({ item }: { item: Item }) {
  const t = useTranslations('item');
  const keys = recipeKeys(item);
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
            path: nexoPluginPath(`recipes/<${t('recipes.typePlaceholder')}>/`),
            command: `/${NEXO_RELOAD_COMMAND}`,
          })}
        </AlertDescription>
      </Alert>
    </div>
  );
}
