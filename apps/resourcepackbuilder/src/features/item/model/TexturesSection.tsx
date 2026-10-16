import { useTranslations } from 'next-intl';
import type { ImportedModel } from '@resourcepackbuilder/minecraft';
import { parseTexturePlaceholder } from '@resourcepackbuilder/utils';
import { AutoGrid } from '@resourcepackbuilder/ui';
import { Section } from '../../../components/Section';
import { TextureCard } from './TextureCard';
import { TextureReferenceCard } from './TextureReferenceCard';

/** The model's own textures and the textures it references from elsewhere (e.g. vanilla ones). */
export function TexturesSection({ itemId, model }: { itemId: string; model: ImportedModel }) {
  const t = useTranslations('item');
  const references = Object.entries(model.json.textures ?? {});
  const usedTextureIds = new Set(references.map(([, value]) => parseTexturePlaceholder(value)));
  const externalReferences = references.filter(([, value]) => !value.startsWith('#') && !parseTexturePlaceholder(value));
  return (
    <Section title={t('model.textures')}>
      <AutoGrid min="16rem" className="gap-3">
        {model.textures.map((texture) => (
          <TextureCard key={texture.id} itemId={itemId} texture={texture} isUsed={usedTextureIds.has(texture.id)} />
        ))}
        {externalReferences.map(([key, reference]) => (
          <TextureReferenceCard key={key} itemId={itemId} textureKey={key} reference={reference} />
        ))}
      </AutoGrid>
    </Section>
  );
}
