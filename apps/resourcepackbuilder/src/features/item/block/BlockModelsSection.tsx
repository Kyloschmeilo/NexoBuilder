import { useTranslations } from 'next-intl';
import { DIRECTIONAL_MODEL_SLOTS, directionalFaces, isStringBlock, type Item, STACK_MODELS } from '@resourcepackbuilder/core/project';
import { Section } from '../../../components/Section';
import { VariantCard } from './VariantCard';

/**
 * Extra block models: the stack stages of a STRINGBLOCK and the face models of a directional NoteBlock (one per face
 * of its directional type).
 */
export function BlockModelsSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const faces = directionalFaces(item.config);
  const faceDefs = DIRECTIONAL_MODEL_SLOTS.filter((def) => faces.some((face) => def.slot === `dir_${face}`));
  const isStackable = isStringBlock(item.config);
  if (!isStackable && faceDefs.length === 0) return null;
  return (
    <Section title={t('slots.blockTitle')}>
      {isStackable && <VariantCard item={item} def={STACK_MODELS} removable={false} />}
      {faceDefs.map((def) => (
        <VariantCard key={def.slot} item={item} def={def} removable={false} />
      ))}
    </Section>
  );
}
