/**
 * Block settings as a feature list (UX §3.4): each setting the block uses is a collapsed row with its value, YAML
 * path and wiki link (on/off and single numbers are edited right in the row), and "Add setting" opens the catalog of
 * the settings it does not use yet. The same list edits the settings of one state variant, whose properties are the
 * block settings re-rooted under the variant (`schema` with those properties).
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { activeProperties, emptyPropertyValue, type FormSchema, getPropertyValue, type PropertyDef } from '@resourcepackbuilder/core/form';
import { type Item, toConfigValue } from '@resourcepackbuilder/core/project';
import { EmptyHint } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { setItemProperty } from '../../../commands/items';
import { CatalogDialog, catalogFromPropertyGroup, useCatalogText } from '../../../components/catalog';
import { expandFeature, FeatureList, featureExpansionKey, PropertyFeatureRow } from '../../../components/features';
import { useOpenProject } from '../../../store/project';

/** The form group of CraftEngine's block settings. */
export const BLOCK_SETTINGS_GROUP = 'blockSettings';

/** The settings the block (or variant) uses, and the button and dialog that add more. */
export function useBlockSettings(item: Item, schema: FormSchema, scope: string) {
  const t = useTranslations('item');
  const text = useCatalogText();
  const version = useOpenProject().settings.minecraftVersion;
  const [isPicking, setPicking] = useState(false);
  const active = activeProperties(schema, item, BLOCK_SETTINGS_GROUP);
  const add = (ids: string[]) => {
    for (const id of ids) {
      const def = schema.properties.find((candidate) => candidate.id === id);
      if (!def) continue;
      setItemProperty(item.id, def, def.defaultValue());
      expandFeature(`${item.id}/${scope}`, def.id);
    }
  };
  const catalog = isPicking
    ? catalogFromPropertyGroup(schema, item, BLOCK_SETTINGS_GROUP, { text, version })
    : { items: [], categories: [] };
  const button = (
    <Button size="sm" variant="outline" onClick={() => setPicking(true)}>
      <Plus /> {t('block.settings.add')}
    </Button>
  );
  const dialog = (
    <CatalogDialog
      open={isPicking}
      onOpenChange={setPicking}
      title={t('block.settings.dialogTitle')}
      searchPlaceholder={t('block.settings.search')}
      items={catalog.items}
      categories={catalog.categories}
      multi
      addLabel={t('block.settings.add')}
      onAdd={add}
      onJumpTo={(id) => {
        expandFeature(`${item.id}/${scope}`, id);
        requestAnimationFrame(() => document.querySelector(`[data-feature-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' }));
      }}
    />
  );
  return { active, button, dialog, open: () => setPicking(true), version };
}

/** The rows of the settings in use; an empty hint with the add action when there are none. */
export function BlockSettingsRows({
  item,
  active,
  scope,
  version,
  empty,
  onAdd,
}: {
  item: Item;
  active: PropertyDef[];
  /** Keeps the rows' expansion apart from other lists of the same settings (the block, each variant) */
  scope: string;
  version: string;
  empty: string;
  onAdd: () => void;
}) {
  const t = useTranslations('item');
  if (active.length === 0) {
    return (
      <EmptyHint actionLabel={t('block.settings.add')} onAction={onAdd}>
        {empty}
      </EmptyHint>
    );
  }
  return (
    <FeatureList>
      {active.map((def) => (
        <PropertyFeatureRow
          key={def.id}
          def={def}
          value={getPropertyValue(item, def)}
          version={version}
          expansionKey={featureExpansionKey(`${item.id}/${scope}`, def.id)}
          onChange={(value) => setItemProperty(item.id, def, toConfigValue(value) ?? emptyPropertyValue(def))}
          onRemove={() => setItemProperty(item.id, def, undefined)}
        />
      ))}
    </FeatureList>
  );
}
