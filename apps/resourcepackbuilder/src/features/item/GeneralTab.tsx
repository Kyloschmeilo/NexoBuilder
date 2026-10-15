import { useId } from 'react';
import { useTranslations } from 'next-intl';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { MATERIALS } from '@resourcepackbuilder/core/nexo/options';
import { DEFAULT_MATERIAL, normalizeTypedMaterial } from '@resourcepackbuilder/core/nexo/material';
import { normalizeTypedId } from '@resourcepackbuilder/core/minecraft/resourceLocation';
import { validateItemId, type ItemIdError } from '@resourcepackbuilder/core/project/ids';
import { itemLabel } from '@resourcepackbuilder/core/project/labels';
import { SectionCard } from '@resourcepackbuilder/ui';
import { Field, FieldDescription, FieldError, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { moveItem, updateItem } from '../../commands/items';
import { TextInput, toStringList } from '../../components/editor';
import { FolderSelect } from '../../components/FolderSelect';
import { ItemTooltip } from '../../components/miniMessage/ItemTooltip';
import { useOpenProject } from '../../store/project';
import { PropertiesPanel } from './properties/PropertiesPanel';

/** Example tags shown in the display-name help (MiniMessage syntax, not translated). */
const DISPLAY_NAME_EXAMPLE = '<gradient:#ff5555:#ffaa00>';
const COLOR_EXAMPLES = '<red>, <#ff8800>, <gradient:#ff0000:#0000ff>';
const FORMATTING_EXAMPLES = '<bold>, <italic>, <!italic>';

function useItemIdErrorText(): (error: ItemIdError | null) => string | null {
  const t = useTranslations('item');
  return (error) => {
    switch (error?.kind) {
      case 'missing':
        return t('general.idEmpty');
      case 'invalid':
        return t('general.idInvalid');
      case 'duplicate':
        return t('general.idDuplicate', { name: itemLabel(error.other) });
      default:
        return null;
    }
  };
}

export function GeneralTab({ item }: { item: Item }) {
  const t = useTranslations('item');
  const project = useOpenProject();
  const idErrorText = useItemIdErrorText();
  const displayNameId = useId();
  const nexoIdId = useId();
  const materialId = useId();
  const folderSelectId = useId();
  const idError = idErrorText(validateItemId(project, item.nexoId, item.id));
  const material = typeof item.config.material === 'string' ? item.config.material : DEFAULT_MATERIAL;

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title={t('general.title')} description={t('general.description')}>
        <div className="grid gap-5 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
          <div className="grid min-w-0 grid-cols-1 gap-4 @xl:grid-cols-2">
            <Field className="gap-1.5 @xl:col-span-2">
              <FieldLabel htmlFor={displayNameId}>{t('general.displayName')}</FieldLabel>
              <Input
                id={displayNameId}
                data-testid="item-display-name"
                value={item.displayName}
                placeholder={t('general.displayNamePlaceholder', { tag: DISPLAY_NAME_EXAMPLE })}
                onChange={(e) =>
                  updateItem(
                    item.id,
                    (d) => {
                      d.displayName = e.target.value;
                    },
                    'displayName',
                  )
                }
              />
              <FieldDescription className="text-xs">
                {t('general.displayNameHelp', { colors: COLOR_EXAMPLES, formatting: FORMATTING_EXAMPLES })}
              </FieldDescription>
            </Field>
            <Field className="gap-1.5" data-invalid={idError ? true : undefined}>
              <FieldLabel htmlFor={nexoIdId}>{t('general.itemId')}</FieldLabel>
              <Input
                id={nexoIdId}
                className="font-mono"
                aria-invalid={idError ? true : undefined}
                value={item.nexoId}
                onChange={(e) =>
                  updateItem(
                    item.id,
                    (d) => {
                      d.nexoId = normalizeTypedId(e.target.value);
                    },
                    'nexoId',
                  )
                }
              />
              {idError && <FieldError className="text-xs">{idError}</FieldError>}
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor={materialId}>{t('general.material')}</FieldLabel>
              <TextInput
                id={materialId}
                value={material}
                suggestions={MATERIALS}
                mono
                onChange={(v) =>
                  updateItem(
                    item.id,
                    (d) => {
                      d.config.material = normalizeTypedMaterial(v ?? '');
                    },
                    'material',
                  )
                }
              />
              <FieldDescription className="text-xs">{t('general.materialHelp')}</FieldDescription>
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor={folderSelectId}>{t('general.folder')}</FieldLabel>
              <FolderSelect id={folderSelectId} value={item.folderId} onChange={(folderId) => moveItem(item.id, folderId)} />
            </Field>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-medium">{t('general.tooltipPreview')}</span>
            <ItemTooltip name={item.displayName || item.nexoId} lore={toStringList(item.config.lore)} />
            <span className="text-xs text-muted-foreground">{t('general.tooltipHelp')}</span>
          </div>
        </div>
      </SectionCard>
      <PropertiesPanel item={item} group="general" />
    </div>
  );
}
