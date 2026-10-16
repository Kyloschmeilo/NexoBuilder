import { useTranslations } from 'next-intl';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { VARIANTS } from '@resourcepackbuilder/core/project/variants';
import { setVariantModels } from '../../../commands/items';
import { AddMenuButton } from '../../../components/AddMenuButton';
import { Section } from '../../../components/Section';
import { useSchemaText } from '../../../components/useSchemaText';
import { VariantCard } from './VariantCard';

function AddVariantButton({ item }: { item: Item }) {
  const tCommon = useTranslations('common');
  const schemaText = useSchemaText();
  return (
    <AddMenuButton
      label={tCommon('add')}
      options={VARIANTS.filter((v) => item.variants?.[v.slot] === undefined).map((def) => ({
        value: def.slot,
        label: schemaText(def.label),
        description: schemaText(def.description),
      }))}
      onSelect={(slot) => setVariantModels(item.id, slot, [])}
    />
  );
}

/** Nexo's "Special Item Appearance": extra models for states like pulling a bow or blocking with a shield. */
export function VariantsSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const active = VARIANTS.filter((v) => item.variants?.[v.slot] !== undefined);
  return (
    <Section
      title={t('variants.title')}
      actions={<AddVariantButton item={item} />}
      empty={active.length === 0 && t.rich('variants.empty', { b: (chunks) => <strong>{chunks}</strong> })}
    >
      {active.map((def) => (
        <VariantCard key={def.slot} item={item} def={def} />
      ))}
    </Section>
  );
}
