import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { Project } from '@resourcepackbuilder/core/project/types';
import { INGREDIENT_SOURCES, type IngredientSource, type RecipeIngredient } from '@resourcepackbuilder/core/nexo/recipes/model';
import { CRAFTING_MATERIALS, ITEM_TAGS } from '@resourcepackbuilder/core/nexo/options';
import { itemLabel } from '@resourcepackbuilder/core/project/labels';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { NumberInput, TextInput, type LiteralChoice } from '../../../components/editor';
import { useOpenProject } from '../../../store/project';

/** Highest amount per slot Nexo accepts for an ingredient. */
const MAX_INGREDIENT_AMOUNT = 64;

/** The project's items as suggestions for a Nexo ingredient: their item id, shown with their name. */
function itemChoices(project: Project): LiteralChoice[] {
  return Object.values(project.items).map((item) => ({ value: item.nexoId, text: itemLabel(item) }));
}

const sourceOf = (value: string): IngredientSource | undefined => INGREDIENT_SOURCES.find((source) => source.value === value)?.value;

/** Source (Minecraft material, Nexo item or tag), id with suggestions and the optional amount of an ingredient. */
export function IngredientRow({ value, onChange }: { value: RecipeIngredient; onChange: (value: RecipeIngredient) => void }) {
  const t = useTranslations('item');
  const tSchema = useTranslations('schema');
  const project = useOpenProject();
  const nexoItems = useMemo(() => itemChoices(project), [project]);
  const suggestions = value.source === 'minecraft' ? CRAFTING_MATERIALS : value.source === 'nexo' ? nexoItems : ITEM_TAGS;
  const placeholder = {
    minecraft: t('recipes.placeholderMinecraft'),
    nexo: t('recipes.placeholderNexo'),
    tag: t('recipes.placeholderTag'),
  }[value.source];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] gap-1.5 @2xl:grid-cols-[9rem_minmax(0,1fr)_4.5rem]">
      <NativeSelect
        className="col-span-full w-full @2xl:col-span-1"
        aria-label={t('recipes.source')}
        value={value.source}
        onChange={(e) => {
          const source = sourceOf(e.target.value);
          if (source) onChange({ ...value, source });
        }}
      >
        {INGREDIENT_SOURCES.map((source) => (
          <NativeSelectOption key={source.value} value={source.value}>
            {tSchema(source.label as never)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <TextInput
        value={value.id}
        mono
        suggestions={suggestions}
        placeholder={placeholder}
        onChange={(id) => onChange({ ...value, id: value.source === 'minecraft' ? (id ?? '').toUpperCase() : (id ?? '') })}
      />
      <NumberInput
        label={t('recipes.amount')}
        value={value.amount}
        integer
        min={1}
        max={MAX_INGREDIENT_AMOUNT}
        placeholder="1×"
        onChange={(amount) => {
          const next = { ...value };
          if (amount && amount > 1) next.amount = amount;
          else delete next.amount;
          onChange(next);
        }}
      />
    </div>
  );
}
