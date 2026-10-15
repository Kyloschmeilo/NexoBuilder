import { useTranslations } from 'next-intl';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { getPath } from '@resourcepackbuilder/core/nexo/configPath';
import { STACK_MODELS } from '@resourcepackbuilder/core/nexo/variants';
import { isPlainObject } from '@resourcepackbuilder/core/object';
import { EditorSection } from '../EditorSection';
import { VariantCard } from './VariantCard';

/** Stack stages – only with the custom block mechanic of type STRINGBLOCK. */
export function BlockModelsSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const block = getPath(item.config, ['Mechanics', 'custom_block']);
  if (!isPlainObject(block) || block.type !== 'STRINGBLOCK') return null;
  return (
    <EditorSection title={t('slots.blockTitle')}>
      <VariantCard item={item} def={STACK_MODELS} removable={false} />
    </EditorSection>
  );
}
