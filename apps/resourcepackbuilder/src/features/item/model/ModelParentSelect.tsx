/** The hold style of a flat item model (flat item, tool, rod) as a field row with a segmented control. */
import { useTranslations } from 'next-intl';
import {
  formatResourceLocation,
  HOLD_STYLE_PARENTS,
  holdStyleParent,
  type HoldStyleParent,
  type ImportedModel,
  MINECRAFT_NAMESPACE,
} from '@resourcepackbuilder/minecraft';
import { FieldRow, SegmentedControl } from '@resourcepackbuilder/ui';
import { updateItemModel } from '../../../commands/items';

/** Message key below `item.model.holdStyles` (short label) and `item.model.parents` (tooltip) per hold style. */
const PARENT_LABELS = {
  'item/generated': 'generated',
  'item/handheld': 'handheld',
  'item/handheld_rod': 'handheldRod',
} as const satisfies Record<HoldStyleParent, string>;

/** How a flat item model is held (generated / handheld / rod); hidden for models with their own cubes. */
export function ModelParentSelect({ itemId, model }: { itemId: string; model: ImportedModel }) {
  const t = useTranslations('item');
  const parent = holdStyleParent(model.json);
  if (!parent) return null;
  return (
    <FieldRow label={t('model.display')} yamlKey="parent" help={t('model.displayHelp')}>
      <SegmentedControl
        aria-label={t('model.display')}
        value={parent}
        options={HOLD_STYLE_PARENTS.map((p) => ({
          value: p,
          label: t(`model.holdStyles.${PARENT_LABELS[p]}`),
          hint: t(`model.parents.${PARENT_LABELS[p]}`),
        }))}
        onChange={(next) =>
          updateItemModel(itemId, (m) => {
            m.json.parent = formatResourceLocation(MINECRAFT_NAMESPACE, next);
          })
        }
      />
    </FieldRow>
  );
}
