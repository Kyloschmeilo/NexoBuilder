import { useTranslations } from 'next-intl';
import { isStringBlock, type Item, STACK_MODELS } from '@resourcepackbuilder/core/project';
import { Section } from '../../../components/Section';
import { VariantCard } from './VariantCard';

/** Stack stages – only with the custom block mechanic of type STRINGBLOCK. */
export function BlockModelsSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  if (!isStringBlock(item.config)) return null;
  return (
    <Section title={t('slots.blockTitle')}>
      <VariantCard item={item} def={STACK_MODELS} removable={false} />
    </Section>
  );
}
