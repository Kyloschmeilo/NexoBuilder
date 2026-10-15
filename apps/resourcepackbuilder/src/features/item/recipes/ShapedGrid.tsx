import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import { INGREDIENT_LETTERS, type Recipe, type RecipeIngredient } from '@resourcepackbuilder/core/nexo/recipes/model';
import { Tip } from '@resourcepackbuilder/ui';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import type { RecipeUpdater } from './RecipeCard';

/** "Nexo: ruby ×2", "#planks", "DIAMOND" – the tooltip of a grid slot. */
function ingredientText(ingredient: RecipeIngredient | undefined): string | null {
  if (!ingredient?.id) return null;
  const prefix = ingredient.source === 'nexo' ? 'Nexo: ' : ingredient.source === 'tag' ? '#' : '';
  const amount = ingredient.amount && ingredient.amount > 1 ? ` ×${ingredient.amount}` : '';
  return `${prefix}${ingredient.id}${amount}`;
}

/** The 3×3 crafting grid of a shaped recipe; each slot holds an ingredient letter or nothing. */
export function ShapedGrid({ recipe, update }: { recipe: Recipe; update: RecipeUpdater }) {
  const t = useTranslations('item');
  const letters = INGREDIENT_LETTERS.filter((letter) => recipe.ingredients[letter]);
  return (
    <div className="grid w-full max-w-80 grid-cols-3 gap-1.5">
      {recipe.grid.map((slot, index) => (
        <Tip key={index} label={slot ? (ingredientText(recipe.ingredients[slot]) ?? t('recipes.emptyIngredient')) : t('recipes.emptySlot')}>
          <NativeSelect
            className={cn(
              'w-full [&_select]:h-14 [&_select]:pl-8 [&_select]:text-center [&_select]:text-base [&_select]:font-bold',
              slot && '[&_select]:bg-primary/10',
            )}
            value={slot}
            aria-label={t('recipes.grid')}
            onChange={(e) =>
              update((r) => {
                r.grid[index] = e.target.value;
              }, `${recipe.id}:grid`)
            }
          >
            <NativeSelectOption value="">–</NativeSelectOption>
            {letters.map((letter) => (
              <NativeSelectOption key={letter} value={letter}>
                {letter}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Tip>
      ))}
    </div>
  );
}
