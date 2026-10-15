import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { RECIPE_TYPES } from '@resourcepackbuilder/core/nexo/recipes/model';
import { recipeKeys } from '@resourcepackbuilder/core/nexo/recipes/files';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@resourcepackbuilder/ui/components/dropdown-menu';
import { richTags } from '../../../i18n/richTags';
import { addRecipe } from '../../../commands/items';
import { EditorSection } from '../EditorSection';
import { RecipeCard } from './RecipeCard';

/** The command that loads exported recipes on the server. */
const RELOAD_COMMAND = '/nexo reload all';

function AddRecipeButton({ itemId }: { itemId: string }) {
  const tCommon = useTranslations('common');
  const tSchema = useTranslations('schema');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" />}>
        <Plus /> {tCommon('add')}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-82 max-w-[calc(100vw-2rem)]">
        {RECIPE_TYPES.map((type) => (
          <DropdownMenuItem key={type.type} className="flex-col items-start gap-0.5" onClick={() => addRecipe(itemId, type.type)}>
            <span className="font-medium">{tSchema(type.label as never)}</span>
            <span className="text-xs text-muted-foreground">{tSchema(type.description as never)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The item's crafting, cooking and stonecutting recipes. */
export function RecipesTab({ item }: { item: Item }) {
  const t = useTranslations('item');
  const keys = recipeKeys(item);
  return (
    <div className="flex flex-col gap-4">
      <EditorSection
        title={t('recipes.title')}
        actions={<AddRecipeButton itemId={item.id} />}
        empty={item.recipes.length === 0 && t.rich('recipes.empty', { b: (chunks) => <strong>{chunks}</strong> })}
      >
        {item.recipes.map((recipe) => (
          <RecipeCard key={recipe.id} item={item} recipe={recipe} recipeKey={keys.get(recipe.id) ?? recipe.type} />
        ))}
      </EditorSection>
      <Alert variant="info">
        <AlertDescription>
          {t.rich('recipes.exportHint', {
            ...richTags,
            path: `plugins/Nexo/recipes/<${t('recipes.typePlaceholder')}>/`,
            command: RELOAD_COMMAND,
          })}
        </AlertDescription>
      </Alert>
    </div>
  );
}
