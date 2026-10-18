/**
 * One property group of an item (Components, Mechanics, Data …) as a single panel: a header row with the group's name,
 * the number of features and "Add feature", then one collapsed row per feature the item uses. "Add feature" opens the
 * catalog of the group, with its categories, common entries and search. Only one feature row of the item is open at a
 * time.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { activeProperties, emptyPropertyValue, getPropertyValue, type PropertyGroup } from '@resourcepackbuilder/core/form';
import { type Item, toConfigValue } from '@resourcepackbuilder/core/project';
import { cn } from '@resourcepackbuilder/ui/cn';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { addProperty, removeProperty, setItemProperty } from '../../../commands/items';
import { CatalogDialog, catalogFromPropertyGroup, useCatalogText } from '../../../components/catalog';
import { FeatureList, featureExpansionKey, PropertyFeatureRow } from '../../../components/features';
import { useOpenProject } from '../../../store/project';
import { scrollToFeature, setFeatureOpen } from './featureFocus';
import { useProjectForm } from './useProjectForm';

export interface PropertyGroupPanelProps {
  item: Item;
  group: PropertyGroup;
  /** Limits the group to these property ids (a CraftEngine block offers the keys of its behavior only). */
  only?: string[];
  /** Leaves out these property ids (another section edits them). */
  exclude?: readonly string[];
  /** Overrides the group's title. */
  title?: string;
  className?: string;
}

/** The group's texts: its title and the line shown while it is empty (the keys exist for every group of every form). */
function useGroupText(group: PropertyGroup) {
  const t = useTranslations('item');
  return {
    title: t(`properties.titles.${group}` as never),
    empty: t(`properties.empty.${group}` as never),
  };
}

/** A property group of the item editor: a feature list with "Add feature". Needs a `FieldContext` above it. */
export function PropertyGroupPanel({ item, group, only, exclude, title, className }: PropertyGroupPanelProps) {
  const t = useTranslations('item');
  const schema = useProjectForm();
  const text = useCatalogText();
  const version = useOpenProject().settings.minecraftVersion;
  const groupText = useGroupText(group);
  const [isAdding, setIsAdding] = useState(false);
  const shown = (id: string) => (!only || only.includes(id)) && !exclude?.includes(id);
  const active = activeProperties(schema, item, group).filter((def) => shown(def.id));
  const offered =
    only || exclude ? schema.properties.filter((def) => def.group === group && shown(def.id)).map((def) => def.id) : undefined;
  const name = title ?? groupText.title;
  const catalog = isAdding ? catalogFromPropertyGroup(schema, item, group, { text, version, only: offered }) : null;

  const add = (ids: string[]) => {
    ids.forEach((id) => addProperty(item.id, id));
    const last = ids.at(-1);
    if (last) {
      setFeatureOpen(item.id, last, true);
      scrollToFeature(last);
    }
  };
  const jumpTo = (id: string) => {
    setFeatureOpen(item.id, id, true);
    scrollToFeature(id);
  };

  return (
    <FeatureList data-section-id={`group-${group}`} className={cn('scroll-mt-4', className)}>
      <header className="flex min-h-11 items-center gap-2 px-3 py-1.5">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-baseline gap-2">
            <h2 className="m-0 truncate text-title font-semibold text-text">{name}</h2>
            {active.length > 0 && (
              <span className="text-meta text-text-faint tabular-nums">{t('features.count', { count: active.length })}</span>
            )}
          </div>
          {active.length === 0 && <p className="m-0 truncate text-meta text-text-muted">{groupText.empty}</p>}
        </div>
        <Button variant="ghost" size="sm" className="flex-none text-primary hover:text-primary" onClick={() => setIsAdding(true)}>
          <Plus /> {t('features.add')}
        </Button>
      </header>
      {active.map((def) => (
        <PropertyFeatureRow
          key={def.id}
          def={def}
          value={getPropertyValue(item, def)}
          version={version}
          expansionKey={featureExpansionKey(item.id, def.id)}
          onOpenChange={(open) => setFeatureOpen(item.id, def.id, open)}
          onChange={(value) => setItemProperty(item.id, def, toConfigValue(value) ?? emptyPropertyValue(def))}
          onRemove={() => removeProperty(item.id, def.id)}
        />
      ))}
      {catalog && (
        <CatalogDialog
          open={isAdding}
          onOpenChange={setIsAdding}
          title={t('features.addTitle', { group: name })}
          description={t('features.addDescription')}
          addLabel={t('features.add')}
          multi
          {...catalog}
          onAdd={add}
          onJumpTo={jumpTo}
        />
      )}
    </FeatureList>
  );
}
