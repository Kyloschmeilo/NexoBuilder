/**
 * A texture the model takes from elsewhere, as a tile: Minecraft's own textures work as they are, others are missing
 * from the pack until a PNG is assigned.
 */
import { useTranslations } from 'next-intl';
import { ImageUp } from 'lucide-react';
import { cn } from '@resourcepackbuilder/ui/cn';
import { isVanillaReference } from '@resourcepackbuilder/minecraft';
import { Thumb } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { assignTextureReference } from '../../../commands/items';
import { usePngPicker } from '../../../hooks/useFileReaders';
import { TextureTile } from './TextureCard';

const THUMB_SIZE = 48;

interface TextureReferenceCardProps {
  itemId: string;
  /** The texture key in the model (without the leading #). */
  textureKey: string;
  /** The referenced texture, e.g. "minecraft:item/stick". */
  reference: string;
}

/** A referenced texture: its key and reference, whether it exists, and a button that assigns a PNG of the pack. */
export function TextureReferenceCard({ itemId, textureKey, reference }: TextureReferenceCardProps) {
  const t = useTranslations('item');
  const pickPng = usePngPicker();
  const isVanilla = isVanillaReference(reference);
  const assign = async () => {
    const png = await pickPng();
    if (png) assignTextureReference(itemId, reference, png.name, png.dataUrl);
  };
  return (
    <TextureTile invalid={!isVanilla}>
      <Thumb size={THUMB_SIZE} fallback={<ImageUp className="size-5 opacity-60" />} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-1">
          <code className="min-h-7 min-w-0 flex-1 truncate font-mono text-label leading-7 font-medium text-text">#{textureKey}</code>
          <Button variant="ghost" size="sm" onClick={() => void assign()}>
            <ImageUp /> {t('model.texture.assignOwnPng')}
          </Button>
        </div>
        <span className={cn('text-meta break-all', isVanilla ? 'text-text-muted' : 'text-danger')}>
          {reference} {isVanilla ? t('model.texture.minecraftTexture') : t('model.texture.notInPack')}
        </span>
      </div>
    </TextureTile>
  );
}
