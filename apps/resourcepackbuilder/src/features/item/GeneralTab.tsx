import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { DEFAULT_MATERIAL, type Item, validateItemId } from '@resourcepackbuilder/core/project';
import { SectionCard } from '@resourcepackbuilder/ui';
import { Field, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { moveItem, updateItem } from '../../commands/items';
import { toStringList } from '../../components/editor';
import { FolderSelect } from '../../components/FolderSelect';
import { ItemIdentityFields } from '../../components/ItemIdentityFields';
import { ItemTooltip } from '../../components/miniMessage/ItemTooltip';
import { useOpenProject } from '../../store/project';
import { PropertiesPanel } from './properties/PropertiesPanel';

export function GeneralTab({ item }: { item: Item }) {
  const t = useTranslations('item');
  const project = useOpenProject();
  const folderSelectId = useId();
  const material = typeof item.config.material === 'string' ? item.config.material : DEFAULT_MATERIAL;

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title={t('general.title')} description={t('general.description')}>
        <div className="grid gap-5 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
          <div className="grid min-w-0 grid-cols-1 gap-4 @xl:grid-cols-2">
            <ItemIdentityFields
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
              showHelp
              displayNameTestId="item-display-name"
              fieldClassName="gap-1.5"
              displayNameClassName="@xl:col-span-2"
            />
            <Field className="gap-1.5">
              <FieldLabel htmlFor={folderSelectId}>{t('general.folder')}</FieldLabel>
              <FolderSelect id={folderSelectId} value={item.folderId} onChange={(folderId) => moveItem(item.id, folderId)} />
            </Field>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-medium">{t('general.tooltipPreview')}</span>
            <ItemTooltip name={item.displayName || item.itemId} lore={toStringList(item.config.lore)} />
            <span className="text-xs text-muted-foreground">{t('general.tooltipHelp')}</span>
          </div>
        </div>
      </SectionCard>
      <PropertiesPanel item={item} group="general" />
    </div>
  );
}
