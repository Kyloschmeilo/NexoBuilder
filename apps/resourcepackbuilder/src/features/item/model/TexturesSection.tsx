/**
 * The Textures section of the item editor: a tile per texture of the model, and a tile per texture the model takes
 * from elsewhere (Minecraft's own, or one missing from the pack).
 */
import { useTranslations } from 'next-intl';
import type { Item } from '@resourcepackbuilder/core/project';
import { parseTexturePlaceholder } from '@resourcepackbuilder/utils';
import { EmptyHint, Section } from '@resourcepackbuilder/ui';
import { TextureCard } from './TextureCard';
import { TextureReferenceCard } from './TextureReferenceCard';

/** The texture tiles of the item's model; a muted line while the item has no model. */
export function TexturesSection({ item, id = 'textures' }: { item: Item; id?: string }) {
  const t = useTranslations('item');
  const model = item.model;
  const references = Object.entries(model?.json.textures ?? {});
  const usedTextureIds = new Set(references.map(([, value]) => parseTexturePlaceholder(value)));
  const externalReferences = references.filter(([, value]) => !value.startsWith('#') && !parseTexturePlaceholder(value));
  const count = (model?.textures.length ?? 0) + externalReferences.length;
  return (
    <Section
      id={id}
      title={t('model.textures')}
      meta={count > 0 && <span className="text-meta text-text-muted tabular-nums">{t('model.texturesCount', { count })}</span>}
    >
      {model && count > 0 ? (
        <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 @xl/section:grid-cols-2">
          {model.textures.map((texture) => (
            <li key={texture.id} className="min-w-0">
              <TextureCard itemId={item.id} texture={texture} isUsed={usedTextureIds.has(texture.id)} />
            </li>
          ))}
          {externalReferences.map(([key, reference]) => (
            <li key={key} className="min-w-0">
              <TextureReferenceCard itemId={item.id} textureKey={key} reference={reference} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyHint>{model ? t('model.textureCount', { count: 0 }) : t('model.texturesEmpty')}</EmptyHint>
      )}
    </Section>
  );
}
