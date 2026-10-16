import { useTranslations } from 'next-intl';
import type { Item } from '@resourcepackbuilder/core/project';
import { activeProperties, type PropertyGroup } from '@resourcepackbuilder/core/nexo';
import { Section } from '../../../components/Section';
import { AddPropertyButton } from './AddPropertyButton';
import { PropertyCard } from './PropertyCard';

/** The properties of one group the item uses, each in its own card, and a button to add more. */
export function PropertiesPanel({ item, group }: { item: Item; group: PropertyGroup }) {
  const t = useTranslations('item');
  const active = activeProperties(item, group);
  return (
    <Section
      title={t(`properties.titles.${group}`)}
      actions={<AddPropertyButton item={item} group={group} />}
      empty={
        active.length === 0 &&
        t.rich('properties.emptyHint', { text: t(`properties.empty.${group}`), b: (chunks) => <strong>{chunks}</strong> })
      }
    >
      {active.map((def) => (
        <PropertyCard key={def.id} item={item} def={def} />
      ))}
    </Section>
  );
}
