import { useId } from 'react';
import { useTranslations } from 'next-intl';
import type { ImportedModel } from '@resourcepackbuilder/core/model/types';
import { Field, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { updateItemModel } from '../../../commands/items';

/** The vanilla parents a flat (element-less) item model can switch between. */
const ITEM_PARENTS = [
  { value: 'minecraft:item/generated', label: 'generated' },
  { value: 'minecraft:item/handheld', label: 'handheld' },
  { value: 'minecraft:item/handheld_rod', label: 'handheldRod' },
] as const;

const withNamespace = (parent: string) => (parent.includes(':') ? parent : `minecraft:${parent}`);

/** How a flat item model is held (generated / handheld / rod); hidden for models with their own cubes. */
export function ModelParentSelect({ itemId, model }: { itemId: string; model: ImportedModel }) {
  const t = useTranslations('item');
  const selectId = useId();
  const parent = withNamespace(model.json.parent ?? '');
  if (model.json.elements || !ITEM_PARENTS.some((p) => p.value === parent)) return null;
  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={selectId}>{t('model.display')}</FieldLabel>
      <NativeSelect
        id={selectId}
        className="w-full"
        value={parent}
        onChange={(e) =>
          updateItemModel(itemId, (m) => {
            m.json.parent = e.target.value;
          })
        }
      >
        {ITEM_PARENTS.map((p) => (
          <NativeSelectOption key={p.value} value={p.value}>
            {t(`model.parents.${p.label}`)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
}
