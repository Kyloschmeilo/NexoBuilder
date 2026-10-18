/**
 * The Basics section of the item editor: display name, item ID, material and folder as field rows with a tooltip
 * preview, then the item's general features (lore, unbreakable …) as one feature list.
 */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { DEFAULT_MATERIAL, type Item, validateItemId } from '@resourcepackbuilder/core/project';
import { FieldGroup, FieldRow, Section } from '@resourcepackbuilder/ui';
import { moveItem, updateItem } from '../../../commands/items';
import { toStringList } from '../../../components/editor';
import { FolderSelect } from '../../../components/FolderSelect';
import { ItemIdentityRows } from '../../../components/ItemIdentityFields';
import { ItemTooltip } from '../../../components/miniMessage/ItemTooltip';
import { useOpenProject } from '../../../store/project';
import { PropertyGroupPanel } from '../properties/PropertyGroupPanel';

/** The group of the form that holds the general features (both targets call it `general`). */
const GENERAL_GROUP = 'general';

/** Name, id, material, folder and tooltip preview of the item, followed by its general features. */
export function BasicsSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const project = useOpenProject();
  const folderSelectId = useId();
  const material = typeof item.config.material === 'string' ? item.config.material : DEFAULT_MATERIAL;

  return (
    <div className="flex flex-col gap-3">
      <Section id="basics" title={t('sections.basics')}>
        <FieldGroup>
          <ItemIdentityRows
            value={{ displayName: item.displayName, itemId: item.itemId, material }}
            idError={validateItemId(project, item.itemId, item.id)}
            onChange={(patch, field) =>
              updateItem(
                item.id,
                (d) => {
                  if (patch.displayName !== undefined) d.displayName = patch.displayName;
                  if (patch.itemId !== undefined) d.itemId = patch.itemId;
                  if (patch.material !== undefined) d.config.material = patch.material;
                },
                field,
              )
            }
            displayNameTestId="item-display-name"
          />
          <FieldRow label={t('general.folder')} htmlFor={folderSelectId}>
            <FolderSelect id={folderSelectId} value={item.folderId} onChange={(folderId) => moveItem(item.id, folderId)} />
          </FieldRow>
          <FieldRow label={t('general.tooltipPreview')} help={t('general.tooltipHelp')}>
            <ItemTooltip name={item.displayName || item.itemId} lore={toStringList(item.config.lore)} />
          </FieldRow>
        </FieldGroup>
      </Section>
      <PropertyGroupPanel item={item} group={GENERAL_GROUP} />
    </div>
  );
}
