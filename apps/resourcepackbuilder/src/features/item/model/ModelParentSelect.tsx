import { useId } from 'react';
import { useTranslations } from 'next-intl';
import {
  formatResourceLocation,
  HOLD_STYLE_PARENTS,
  holdStyleParent,
  type HoldStyleParent,
  type ImportedModel,
  MINECRAFT_NAMESPACE,
} from '@resourcepackbuilder/minecraft';
import { Field, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { isOneOf } from '../../../lib/isOneOf';
import { updateItemModel } from '../../../commands/items';

/** Message key below `item.model.parents` per hold style. */
const PARENT_LABELS = {
  'item/generated': 'generated',
  'item/handheld': 'handheld',
  'item/handheld_rod': 'handheldRod',
} as const satisfies Record<HoldStyleParent, string>;

/** How a flat item model is held (generated / handheld / rod); hidden for models with their own cubes. */
export function ModelParentSelect({ itemId, model }: { itemId: string; model: ImportedModel }) {
  const t = useTranslations('item');
  const selectId = useId();
  const parent = holdStyleParent(model.json);
  if (!parent) return null;
  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={selectId}>{t('model.display')}</FieldLabel>
      <NativeSelect
        id={selectId}
        className="w-full"
        value={parent}
        onChange={(e) => {
          const next = e.target.value;
          if (!isOneOf(HOLD_STYLE_PARENTS, next)) return;
          updateItemModel(itemId, (m) => {
            m.json.parent = formatResourceLocation(MINECRAFT_NAMESPACE, next);
          });
        }}
      >
        {HOLD_STYLE_PARENTS.map((p) => (
          <NativeSelectOption key={p} value={p}>
            {t(`model.parents.${PARENT_LABELS[p]}`)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
}
