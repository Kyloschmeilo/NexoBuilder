import { useTranslations } from 'next-intl';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { MATERIALS } from '@resourcepackbuilder/core/nexo/options';
import { validateItemId } from '@resourcepackbuilder/core/project/ids';
import { itemLabel } from '@resourcepackbuilder/core/project/labels';
import { moveItem, updateItem } from '../../commands/items';
import { TextInput } from '../../components/editor';
import { ItemTooltip } from '../../components/MiniMessage';
import { useOpenProject } from '../../store/project';
import { Field, FieldDescription, FieldError, FieldLabel, FieldTitle } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { FolderSelect } from '../../components/FolderSelect';
import { PropertiesPanel } from './PropertiesPanel';
import { EditorCard } from './EditorCard';

export function GeneralTab({ item }: { item: Item }) {
  const t = useTranslations('item');
  const project = useOpenProject();
  const idProblem = validateItemId(project, item.nexoId, item.id);
  const idError =
    idProblem?.kind === 'missing'
      ? t('general.idEmpty')
      : idProblem?.kind === 'invalid'
        ? t('general.idInvalid')
        : idProblem?.kind === 'duplicate'
          ? t('general.idDuplicate', { name: itemLabel(idProblem.other) })
          : null;
  const material = typeof item.config.material === 'string' ? item.config.material : 'PAPER';
  const lore = Array.isArray(item.config.lore) ? item.config.lore.map((l) => String(l ?? '')) : undefined;
  const displayNameId = `item-${item.id}-display-name`;
  const nexoIdId = `item-${item.id}-nexo-id`;

  return (
    <div>
      <EditorCard title={t('general.title')} description={t('general.description')}>
        <div className="flex flex-wrap gap-5">
          <div className="grid min-w-0 flex-[1_1_380px] grid-cols-1 gap-4 sm:grid-cols-2">
            <Field className="gap-1.5 sm:col-span-2">
              <FieldLabel htmlFor={displayNameId}>{t('general.displayName')}</FieldLabel>
              <Input
                id={displayNameId}
                value={item.displayName}
                placeholder={t('general.displayNamePlaceholder', { tag: '<gradient:#ff5555:#ffaa00>' })}
                onChange={(e) => updateItem(item.id, (d) => (d.displayName = e.target.value), 'displayName')}
              />
              <FieldDescription className="text-xs">
                {t('general.displayNameHelp', {
                  colors: '<red>, <#ff8800>, <gradient:#ff0000:#0000ff>',
                  formatting: '<bold>, <italic>, <!italic>',
                })}
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
                  updateItem(item.id, (d) => (d.nexoId = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')), 'nexoId')
                }
              />
              {idError && <FieldError className="text-xs">{idError}</FieldError>}
            </Field>
            <Field className="gap-1.5">
              <FieldTitle>{t('general.material')}</FieldTitle>
              <TextInput
                value={material}
                suggestions={MATERIALS}
                mono
                onChange={(v) =>
                  updateItem(item.id, (d) => (d.config.material = (v ?? '').toUpperCase().replace(/[^A-Z0-9_]/g, '_')), 'material')
                }
              />
              <FieldDescription className="text-xs">{t('general.materialHelp')}</FieldDescription>
            </Field>
            <Field className="gap-1.5">
              <FieldTitle>{t('general.folder')}</FieldTitle>
              <FolderSelect value={item.folderId} onChange={(folderId) => moveItem(item.id, folderId)} />
            </Field>
          </div>
          <div className="flex max-w-[340px] flex-[1_1_220px] flex-col gap-1.5">
            <span className="text-sm font-medium">{t('general.tooltipPreview')}</span>
            <ItemTooltip name={item.displayName || item.nexoId} lore={lore} />
            <span className="text-xs text-muted-foreground">{t('general.tooltipHelp')}</span>
          </div>
        </div>
      </EditorCard>
      <PropertiesPanel item={item} groups={['general']} title={t('properties.titles.general')} emptyText={t('properties.empty.general')} />
    </div>
  );
}
