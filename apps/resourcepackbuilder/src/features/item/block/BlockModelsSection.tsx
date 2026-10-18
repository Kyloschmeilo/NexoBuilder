/**
 * The extra models of a Nexo custom block: the stack stages of a STRINGBLOCK and the face models of a directional
 * NoteBlock (one per face of its directional type). Nothing shows for a block that has neither.
 */
import { useTranslations } from 'next-intl';
import { DIRECTIONAL_MODEL_SLOTS, directionalFaces, isStringBlock, type Item, STACK_MODELS } from '@resourcepackbuilder/core/project';
import { Section } from '@resourcepackbuilder/ui';
import { VariantCard } from '../model/VariantCard';

/** The section's anchor (SectionNav). */
export const BLOCK_MODELS_SECTION_ID = 'block-models';

export function BlockModelsSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const faces = directionalFaces(item.config);
  const faceDefs = DIRECTIONAL_MODEL_SLOTS.filter((def) => faces.some((face) => def.slot === `dir_${face}`));
  const isStackable = isStringBlock(item.config);
  if (!isStackable && faceDefs.length === 0) return null;
  return (
    <Section id={BLOCK_MODELS_SECTION_ID} title={t('slots.blockTitle')} description={t('block.nexo.modelsDescription')}>
      <div className="flex flex-col gap-3">
        {isStackable && <VariantCard item={item} def={STACK_MODELS} removable={false} />}
        {faceDefs.map((def) => (
          <VariantCard key={def.slot} item={item} def={def} removable={false} />
        ))}
      </div>
    </Section>
  );
}
