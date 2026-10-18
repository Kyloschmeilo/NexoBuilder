/**
 * "Add feature" for places that list properties outside a {@link PropertyGroupPanel} (the settings of a block state
 * variant): a button that opens the catalog of one property group.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import type { Item } from '@resourcepackbuilder/core/project';
import type { FormSchema, PropertyDef, PropertyGroup } from '@resourcepackbuilder/core/form';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { addProperty } from '../../../commands/items';
import { CatalogDialog, catalogFromPropertyGroup, useCatalogText } from '../../../components/catalog';
import { useOpenProject } from '../../../store/project';

/**
 * A button that opens the catalog of the group's properties (those in `only`, if given); the ones the item uses are
 * marked added. `onAdd` replaces adding by id, for properties that are not in the form (e.g. the settings of a block
 * state variant).
 */
export function AddPropertyButton({
  schema,
  item,
  group,
  only,
  onAdd,
}: {
  schema: FormSchema;
  item: Item;
  group: PropertyGroup;
  only?: string[];
  onAdd?: (def: PropertyDef) => void;
}) {
  const t = useTranslations('item');
  const text = useCatalogText();
  const version = useOpenProject().settings.minecraftVersion;
  const [isOpen, setIsOpen] = useState(false);
  const catalog = isOpen ? catalogFromPropertyGroup(schema, item, group, { text, version, only }) : null;
  const add = (ids: string[]) => {
    for (const id of ids) {
      const def = schema.properties.find((candidate) => candidate.id === id);
      if (!def) continue;
      if (onAdd) onAdd(def);
      else addProperty(item.id, def.id);
    }
  };
  return (
    <>
      <Button variant="ghost" size="sm" className="text-primary hover:text-primary" onClick={() => setIsOpen(true)}>
        <Plus /> {t('features.add')}
      </Button>
      {catalog && (
        <CatalogDialog
          open={isOpen}
          onOpenChange={setIsOpen}
          title={t('features.addTitle', { group: t(`properties.titles.${group}` as never) })}
          description={t('features.addDescription')}
          addLabel={t('features.add')}
          multi
          {...catalog}
          onAdd={add}
        />
      )}
    </>
  );
}
