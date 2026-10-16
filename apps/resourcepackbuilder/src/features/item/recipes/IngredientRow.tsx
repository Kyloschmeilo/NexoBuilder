import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  INGREDIENT_SOURCES,
  type IngredientSource,
  itemLabel,
  MAX_INGREDIENT_AMOUNT,
  type Project,
  type RecipeIngredient,
  withIngredientAmount,
  withIngredientId,
} from '@resourcepackbuilder/core/project';
import { CRAFTING_MATERIALS, ITEM_TAGS } from '@resourcepackbuilder/core/nexo';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { NumberInput, TextInput, type LiteralChoice } from '../../../components/editor';
import { useOpenProject } from '../../../store/project';
import { useSchemaText } from '../../../components/useSchemaText';
import { isOneOf } from '../../../lib/isOneOf';

/** CraftEngine writes vanilla ids in lower case (diamond), Nexo materials in upper case (DIAMOND). */
const LOWER_CASE_MATERIALS = CRAFTING_MATERIALS.map((option) => ({ ...option, value: option.value.toLowerCase() }));

/** The project's items as suggestions for a Nexo ingredient: their item id, shown with their name. */
function itemChoices(project: Project): LiteralChoice[] {
  return Object.values(project.items).map((item) => ({ value: item.itemId, text: itemLabel(item) }));
}

const SOURCES: IngredientSource[] = INGREDIENT_SOURCES.map((source) => source.value);

/** Source (Minecraft material, Nexo item or tag), id with suggestions and the optional amount of an ingredient. */
export function IngredientRow({ value, onChange }: { value: RecipeIngredient; onChange: (value: RecipeIngredient) => void }) {
  const t = useTranslations('item');
  const tSchema = useSchemaText();
  const project = useOpenProject();
  const nexoItems = useMemo(() => itemChoices(project), [project]);
  const materials = project.target === 'craftengine' ? LOWER_CASE_MATERIALS : CRAFTING_MATERIALS;
  const suggestions = value.source === 'minecraft' ? materials : value.source === 'nexo' ? nexoItems : ITEM_TAGS;
  const placeholder = {
    minecraft: t('recipes.placeholderMinecraft', { target: project.target }),
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
          const source = e.target.value;
          if (isOneOf(SOURCES, source)) onChange({ ...value, source });
        }}
      >
        {INGREDIENT_SOURCES.map((source) => (
          <NativeSelectOption key={source.value} value={source.value}>
            {tSchema(source.label)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <TextInput
        value={value.id}
        mono
        suggestions={suggestions}
        placeholder={placeholder}
        onChange={(id) => onChange(withIngredientId(value, id ?? ''))}
      />
      <NumberInput
        label={t('recipes.amount')}
        value={value.amount}
        integer
        min={1}
        max={MAX_INGREDIENT_AMOUNT}
        placeholder="1×"
        onChange={(amount) => onChange(withIngredientAmount(value, amount))}
      />
    </div>
  );
}
