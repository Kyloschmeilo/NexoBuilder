/**
 * Nexo's custom block (`Mechanics.custom_block`) in the frame of the CraftEngine block: the block's type and its
 * plain keys (variation, model, hardness, …) as field rows, and the larger parts (directional faces, log stripping,
 * sapling growth, sounds, drops, storage, click actions, random variants …) as features: collapsed rows that are added
 * from a catalog and expanded one at a time. Only the parts the block's type reads are offered.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { type Field, getPropertyValue, type ObjectField, propertyById, type PropertyDef } from '@resourcepackbuilder/core/form';
import { type ConfigObject, type ConfigValue, type Item, toConfigValue } from '@resourcepackbuilder/core/project';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { EmptyHint, type MenuEntry, Section, StatusPill } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { NEXO_BLOCK_PROPERTY, setItemProperty } from '../../../commands/items';
import { CatalogDialog, type CatalogItem } from '../../../components/catalog';
import { FieldRenderer } from '../../../components/editor';
import { ObjectFields } from '../../../components/editor/editors/ObjectEditor';
import { isFieldVisible } from '../../../components/editor/values';
import { FeatureList, FeatureRow, featureSummary } from '../../../components/features';
import { useSchemaText } from '../../../components/useSchemaText';
import { useProjectForm } from '../properties/useProjectForm';

/** The section's anchor (SectionNav). */
export const NEXO_BLOCK_FEATURES_SECTION_ID = 'block-features';

/** Fields of the custom block that are parts of their own (edited as features), not one plain value. */
const FEATURE_TYPES: ReadonlySet<Field['type']> = new Set(['object', 'objectList', 'stringList', 'map', 'choice', 'yaml', 'typedList']);
const isFeatureField = (field: Field) => FEATURE_TYPES.has(field.type);

/** The value a newly added part starts with. */
function newFeatureValue(field: Field): ConfigValue {
  if (field.type === 'choice') {
    const first = field.choices[0];
    return (first ? toConfigValue(first.newValue()) : undefined) ?? {};
  }
  if (field.type === 'objectList' || field.type === 'stringList' || field.type === 'typedList') return [];
  return {};
}

/** The custom block's property, its field and its current value. */
function useNexoBlock(item: Item) {
  const schema = useProjectForm();
  const def = propertyById(schema, NEXO_BLOCK_PROPERTY) as (PropertyDef & { field: ObjectField }) | undefined;
  const value = def ? getPropertyValue(item, def) : undefined;
  return { def, block: isPlainObject(value) ? value : {} };
}

/** The type and the plain keys of the custom block, as field rows (rarely used ones under "More options"). */
export function NexoBlockBasics({ item }: { item: Item }) {
  const { def, block } = useNexoBlock(item);
  if (!def || def.field.type !== 'object') return null;
  const basics: ObjectField = { ...def.field, fields: def.field.fields.filter((field) => !isFeatureField(field)) };
  return (
    <ObjectFields
      field={basics}
      value={block}
      // The editor gets the whole block, so its parts come back unchanged with the edited key
      onChange={(next) => setItemProperty(item.id, def, toConfigValue(next) ?? {}, 'nexo-block')}
    />
  );
}

/** The parts of the custom block as a feature list with "Add block feature". */
export function NexoBlockFeatures({ item }: { item: Item }) {
  const t = useTranslations('item');
  const tFeature = useTranslations('editor.feature');
  const text = useSchemaText();
  const { def, block } = useNexoBlock(item);
  const [isPicking, setPicking] = useState(false);
  const [openKey, setOpenKey] = useState<{ itemId: string; key: string } | null>(null);
  if (!def || def.field.type !== 'object') return null;
  // The catalog offers the parts the block's type reads; a part that is set stays listed after a type change, so it can
  // still be edited or removed
  const parts = def.field.fields.filter((field) => isFeatureField(field) && isFieldVisible(field, block));
  const used = def.field.fields.filter((field) => isFeatureField(field) && block[field.key] !== undefined);
  const path = (field: Field) => `Mechanics.custom_block.${field.key}`;
  const setPart = (key: string, value: ConfigValue | undefined) => {
    const next: ConfigObject = { ...(block as ConfigObject) };
    if (value === undefined) delete next[key];
    else next[key] = value;
    setItemProperty(item.id, def, next, `nexo-block-${key}`);
  };
  const add = (keys: string[]) => {
    const next: ConfigObject = { ...(block as ConfigObject) };
    for (const key of keys) {
      const field = parts.find((part) => part.key === key);
      if (field && next[key] === undefined) next[key] = newFeatureValue(field);
    }
    setItemProperty(item.id, def, next);
    const last = keys.at(-1);
    if (last) setOpenKey({ itemId: item.id, key: last });
  };
  const items: CatalogItem[] = parts.map((field) => {
    const description = field.help ? text(field.help) : undefined;
    return {
      id: field.key,
      label: text(field.label) ?? field.key,
      ...(description && { description }),
      yamlKey: path(field),
      ...(field.docs && { docs: { url: field.docs, target: 'nexo' as const } }),
      ...(field.advanced && { note: t('block.nexo.advancedNote') }),
      ...(block[field.key] !== undefined && { added: true }),
    };
  });
  const summaryText = {
    on: tFeature('on'),
    off: tFeature('off'),
    notSet: tFeature('notSet'),
    entries: (count: number) => tFeature('entries', { count }),
    option: (key: string) => text(key) ?? key,
  };

  return (
    <Section
      id={NEXO_BLOCK_FEATURES_SECTION_ID}
      title={t('block.nexo.featuresTitle')}
      description={t('block.nexo.featuresDescription')}
      meta={used.length > 0 && <StatusPill tone="muted" label={String(used.length)} />}
      actions={
        <Button size="sm" variant="outline" onClick={() => setPicking(true)}>
          <Plus /> {t('block.nexo.addFeature')}
        </Button>
      }
    >
      {used.length === 0 ? (
        <EmptyHint actionLabel={t('block.nexo.addFeature')} onAction={() => setPicking(true)}>
          {t('block.nexo.featuresEmpty')}
        </EmptyHint>
      ) : (
        <FeatureList>
          {used.map((field) => {
            const value = block[field.key];
            const label = text(field.label) ?? field.key;
            const menu: MenuEntry[] = [
              { icon: <Trash2 />, label: tFeature('remove'), destructive: true, onSelect: () => setPart(field.key, undefined) },
            ];
            const isOpen = openKey?.itemId === item.id && openKey.key === field.key;
            const change = (next: unknown) => setPart(field.key, toConfigValue(next) ?? newFeatureValue(field));
            return (
              <FeatureRow
                key={field.key}
                featureId={path(field)}
                label={label}
                summary={featureSummary(field, value, summaryText)}
                yamlKey={path(field)}
                docs={field.docs ? { url: field.docs, target: 'nexo' } : undefined}
                menu={menu}
                open={isOpen}
                onOpenChange={(open) => setOpenKey(open ? { itemId: item.id, key: field.key } : null)}
              >
                {field.type === 'object' ? (
                  <ObjectFields field={field} value={value} onChange={change} />
                ) : (
                  <FieldRenderer field={field} value={value} root hideLabel onChange={change} />
                )}
              </FeatureRow>
            );
          })}
        </FeatureList>
      )}
      <CatalogDialog
        open={isPicking}
        onOpenChange={setPicking}
        title={t('block.nexo.dialogTitle')}
        searchPlaceholder={t('block.nexo.search')}
        items={items}
        multi
        addLabel={t('block.nexo.addFeature')}
        onAdd={add}
        onJumpTo={(key) => setOpenKey({ itemId: item.id, key })}
      />
    </Section>
  );
}
