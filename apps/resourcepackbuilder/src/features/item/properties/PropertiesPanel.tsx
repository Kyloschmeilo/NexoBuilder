import { useTranslations } from 'next-intl';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { isPropertyActive } from '@resourcepackbuilder/core/nexo/properties';
import { PROPERTIES, type PropertyGroup } from '@resourcepackbuilder/core/nexo/schema';
import { Section } from '../../../components/Section';
import { AddPropertyButton } from './AddPropertyButton';
import { PropertyCard } from './PropertyCard';

export function countActiveProperties(item: Item, group: PropertyGroup): number {
  return PROPERTIES.filter((p) => p.group === group && isPropertyActive(item, p)).length;
}

/** The properties of one group the item uses, each in its own card, and a button to add more. */
export function PropertiesPanel({ item, group }: { item: Item; group: PropertyGroup }) {
  const t = useTranslations('item');
  const active = PROPERTIES.filter((p) => p.group === group && isPropertyActive(item, p));
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
