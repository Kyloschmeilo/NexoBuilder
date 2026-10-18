/**
 * One ingredient of a recipe: its source (offered by what the project's target reads), id with suggestions, the
 * MMOItems item type, the optional amount, and, for a recipe type, the further options the target reads on it
 * (CraftEngine alternatives and predicates, Nexo's replacement, durability damage and preserved components).
 */
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, X } from 'lucide-react';
import {
  type ConfigObject,
  type IngredientRef,
  type IngredientSource,
  ingredientSourcesFor,
  INGREDIENT_SOURCES,
  itemLabel,
  MAX_INGREDIENT_AMOUNT,
  optionsField,
  optionsForType,
  type Project,
  type RecipeIngredient,
  type RecipeType,
  withIngredientAmount,
  withIngredientId,
  withIngredientSource,
} from '@resourcepackbuilder/core/project';
import { CRAFTING_MATERIALS, ITEM_TAGS, NEXO_REPLACEMENT_TYPES } from '@resourcepackbuilder/core/nexo';
import { RECIPE_SECTION_LABELS, recipeOptionsFor } from '@resourcepackbuilder/core/targets';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { CollapsibleSection, IconButton } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Field, FieldTitle } from '@resourcepackbuilder/ui/components/field';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { FieldRenderer, NumberInput, TextInput, type LiteralChoice } from '../../../components/editor';
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

/** Source, id (with suggestions) and the MMOItems item type of an item or tag reference. */
function IngredientRefInputs<T extends IngredientRef>({ value, onChange }: { value: T; onChange: (value: T) => void }) {
  const t = useTranslations('item');
  const tSchema = useSchemaText();
  const project = useOpenProject();
  const nexoItems = useMemo(() => itemChoices(project), [project]);
  const materials = project.target === 'craftengine' ? LOWER_CASE_MATERIALS : CRAFTING_MATERIALS;
  const suggestions =
    value.source === 'minecraft' ? materials : value.source === 'nexo' ? nexoItems : value.source === 'tag' ? ITEM_TAGS : [];
  const placeholder = {
    minecraft: t('recipes.placeholderMinecraft', { target: project.target }),
    nexo: t('recipes.placeholderNexo'),
    tag: t('recipes.placeholderTag'),
    external: t('recipes.placeholderExternal'),
    crucible: t('recipes.placeholderCrucible'),
    mmoitems: t('recipes.placeholderMmoitems'),
  }[value.source];
  // A source the target does not read stays selectable while it is set, so the problem shows and can be fixed
  const sources = ingredientSourcesFor(project.target);
  const options = sources.some((source) => source.value === value.source)
    ? sources
    : [...sources, ...INGREDIENT_SOURCES.filter((source) => source.value === value.source)];
  return (
    <>
      <NativeSelect
        className="col-span-full w-full @2xl:col-span-1"
        aria-label={t('recipes.source')}
        value={value.source}
        onChange={(e) => {
          const source = e.target.value;
          if (isOneOf(SOURCES, source)) onChange(withIngredientSource(value, source));
        }}
      >
        {options.map((source) => (
          <NativeSelectOption key={source.value} value={source.value}>
            {tSchema(source.label)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <div className="flex min-w-0 gap-1.5">
        {value.source === 'mmoitems' && (
          <TextInput
            className="w-28 shrink-0"
            value={value.itemType}
            mono
            placeholder={t('recipes.placeholderItemType')}
            onChange={(itemType) => onChange({ ...value, itemType: itemType?.toUpperCase() || undefined })}
          />
        )}
        <TextInput
          className="min-w-0 flex-1"
          value={value.id}
          mono
          suggestions={suggestions}
          placeholder={placeholder}
          onChange={(id) => onChange(withIngredientId(value, id ?? ''))}
        />
      </div>
    </>
  );
}

/** The further options the project's target reads on an ingredient of the recipe type, folded away until used. */
function IngredientExtras({
  value,
  onChange,
  recipeType,
}: {
  value: RecipeIngredient;
  onChange: (value: RecipeIngredient) => void;
  recipeType: RecipeType;
}) {
  const t = useTranslations('item');
  const tSchema = useSchemaText();
  const project = useOpenProject();
  const options = optionsForType(recipeOptionsFor(project.target).ingredient, recipeType);
  const hasAlternatives = project.target === 'craftengine';
  const hasReplacement = project.target === 'nexo' && NEXO_REPLACEMENT_TYPES.includes(recipeType);
  if (!hasAlternatives && !hasReplacement && options.length === 0) return null;
  const alternatives = value.alternatives ?? [];
  const count =
    (hasAlternatives ? alternatives.length : 0) + (hasReplacement && value.replacement ? 1 : 0) + Object.keys(value.options ?? {}).length;
  const setAlternatives = (list: IngredientRef[]) => {
    const next: RecipeIngredient = { ...value, alternatives: list };
    if (list.length === 0) delete next.alternatives;
    onChange(next);
  };
  return (
    <CollapsibleSection
      title={tSchema(RECIPE_SECTION_LABELS.ingredient)}
      meta={count > 0 && <span className="font-mono">{count}</span>}
      defaultOpen={count > 0}
    >
      <div className="flex flex-col gap-3">
        {hasAlternatives && (
          <Field className="gap-1.5">
            <FieldTitle>{t('recipes.alternatives')}</FieldTitle>
            {alternatives.map((alternative, index) => (
              <div key={index} className="flex items-start gap-1.5">
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-1.5 @2xl:grid-cols-[9rem_minmax(0,1fr)]">
                  <IngredientRefInputs
                    value={alternative}
                    onChange={(next) => setAlternatives(alternatives.map((other, i) => (i === index ? next : other)))}
                  />
                </div>
                <IconButton
                  label={t('recipes.removeAlternative')}
                  variant="ghost-destructive"
                  onClick={() => setAlternatives(alternatives.filter((_, i) => i !== index))}
                >
                  <Trash2 />
                </IconButton>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setAlternatives([...alternatives, { source: 'minecraft', id: '' }])}
            >
              <Plus /> {t('recipes.addAlternative')}
            </Button>
          </Field>
        )}
        {hasReplacement && (
          <Field className="gap-1.5">
            <FieldTitle>{t('recipes.replacement')}</FieldTitle>
            {value.replacement ? (
              <div className="flex items-start gap-1.5">
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-1.5 @2xl:grid-cols-[9rem_minmax(0,1fr)]">
                  <IngredientRefInputs value={value.replacement} onChange={(replacement) => onChange({ ...value, replacement })} />
                </div>
                <IconButton
                  label={t('recipes.removeReplacement')}
                  variant="ghost"
                  onClick={() => {
                    const next = { ...value };
                    delete next.replacement;
                    onChange(next);
                  }}
                >
                  <X />
                </IconButton>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => onChange({ ...value, replacement: { source: 'minecraft', id: '' } })}
              >
                <Plus /> {t('recipes.addReplacement')}
              </Button>
            )}
          </Field>
        )}
        {options.length > 0 && (
          <FieldRenderer
            field={optionsField(options, RECIPE_SECTION_LABELS.ingredient)}
            root
            hideLabel
            value={value.options}
            onChange={(next) => {
              const result = { ...value };
              if (isPlainObject(next) && Object.keys(next).length > 0) result.options = next as ConfigObject;
              else delete result.options;
              onChange(result);
            }}
          />
        )}
      </div>
    </CollapsibleSection>
  );
}

interface IngredientRowProps {
  value: RecipeIngredient;
  onChange: (value: RecipeIngredient) => void;
  /** The recipe type the ingredient belongs to; shows the further options the target reads for it */
  recipeType?: RecipeType;
}

/** Source, id with suggestions and the optional amount of an ingredient, and its further options. */
export function IngredientRow({ value, onChange, recipeType }: IngredientRowProps) {
  const t = useTranslations('item');
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] gap-1.5 @2xl:grid-cols-[9rem_minmax(0,1fr)_4.5rem]">
        <IngredientRefInputs value={value} onChange={onChange} />
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
      {recipeType && <IngredientExtras value={value} onChange={onChange} recipeType={recipeType} />}
    </div>
  );
}
