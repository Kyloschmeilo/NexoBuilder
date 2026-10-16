import { useTranslations } from 'next-intl';
import type { Item } from '@resourcepackbuilder/core/project';
import { activeProperties, type PropertyGroup } from '@resourcepackbuilder/core/form';
import { Section } from '../../../components/Section';
import { AddPropertyButton } from './AddPropertyButton';
import { PropertyCard } from './PropertyCard';
import { useProjectForm } from './useProjectForm';

/** The properties of one group the item uses, each in its own card, and a button to add more. */
export function PropertiesPanel({ item, group }: { item: Item; group: PropertyGroup }) {
  const t = useTranslations('item');
  const schema = useProjectForm();
  const active = activeProperties(schema, item, group);
  // Group ids come from the form at runtime; a test checks the catalogue has a title and an empty text for each of them.
  const groupText = (kind: 'titles' | 'empty') => t(`properties.${kind}.${group}` as never);
  return (
    <Section
      title={groupText('titles')}
      actions={<AddPropertyButton schema={schema} item={item} group={group} />}
      empty={active.length === 0 && t.rich('properties.emptyHint', { text: groupText('empty'), b: (chunks) => <strong>{chunks}</strong> })}
    >
      {active.map((def) => (
        <PropertyCard key={def.id} item={item} def={def} />
      ))}
    </Section>
  );
}
