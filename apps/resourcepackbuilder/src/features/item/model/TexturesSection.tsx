import { useTranslations } from 'next-intl';
import type { ImportedModel } from '@resourcepackbuilder/core/model/types';
import { parseTexturePlaceholder } from '@resourcepackbuilder/core/model/common';
import { EditorSection } from '../EditorSection';
import { TextureCard } from './TextureCard';
import { TextureReferenceCard } from './TextureReferenceCard';

/** The model's own textures and the textures it references from elsewhere (e.g. vanilla ones). */
export function TexturesSection({ itemId, model }: { itemId: string; model: ImportedModel }) {
  const t = useTranslations('item');
  const references = Object.entries(model.json.textures ?? {});
  const usedTextureIds = new Set(references.map(([, value]) => parseTexturePlaceholder(value)));
  const externalReferences = references.filter(([, value]) => !value.startsWith('#') && !parseTexturePlaceholder(value));
  return (
    <EditorSection title={t('model.textures')}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-3">
        {model.textures.map((texture) => (
          <TextureCard key={texture.id} itemId={itemId} texture={texture} isUsed={usedTextureIds.has(texture.id)} />
        ))}
        {externalReferences.map(([key, reference]) => (
          <TextureReferenceCard key={key} itemId={itemId} textureKey={key} reference={reference} />
        ))}
      </div>
    </EditorSection>
  );
}
