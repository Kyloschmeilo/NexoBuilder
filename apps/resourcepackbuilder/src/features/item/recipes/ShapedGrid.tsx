/** The visual 3×3 crafting grid of a shaped recipe: each cell picks one of the recipe's ingredient letters. */
import { useTranslations } from 'next-intl';
import { cn } from '@resourcepackbuilder/ui/cn';
import { ingredientLetters, type Project, type Recipe, type RecipeIngredient } from '@resourcepackbuilder/core/project';
import { Tip } from '@resourcepackbuilder/ui';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { useOpenProject } from '../../../store/project';
import type { RecipeUpdater } from './RecipeEditor';

/** "Nexo: ruby ×2" (CraftEngine: "namespace:ruby ×2"), "#planks", "DIAMOND" – the tooltip of a grid slot. */
function ingredientText(project: Pick<Project, 'namespace' | 'target'>, ingredient: RecipeIngredient | undefined): string | null {
  if (!ingredient?.id) return null;
  const itemPrefix = project.target === 'craftengine' ? `${project.namespace}:` : 'Nexo: ';
  const prefix = ingredient.source === 'nexo' ? itemPrefix : ingredient.source === 'tag' ? '#' : '';
  const amount = ingredient.amount && ingredient.amount > 1 ? ` ×${ingredient.amount}` : '';
  return `${prefix}${ingredient.id}${amount}`;
}

/** The 3×3 crafting grid of a shaped recipe; each slot holds an ingredient letter or nothing. */
export function ShapedGrid({ recipe, update }: { recipe: Recipe; update: RecipeUpdater }) {
  const t = useTranslations('item');
  const project = useOpenProject();
  const letters = ingredientLetters(recipe);
  return (
    <div data-slot="shaped-grid" className="grid w-45 flex-none grid-cols-3 gap-1.5">
      {recipe.grid.map((slot, index) => (
        <Tip
          key={index}
          label={slot ? (ingredientText(project, recipe.ingredients[slot]) ?? t('recipes.emptyIngredient')) : t('recipes.emptySlot')}
        >
          <NativeSelect
            className={cn(
              'w-full [&_select]:h-14 [&_select]:px-0 [&_select]:text-center [&_select]:[text-align-last:center] [&_select]:font-mono [&_select]:text-base [&_select]:font-semibold [&_svg]:hidden',
              slot ? '[&_select]:border-primary/40 [&_select]:bg-primary/10 [&_select]:text-primary' : '[&_select]:text-text-faint',
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
