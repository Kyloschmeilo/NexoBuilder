import { useTranslations } from 'next-intl';
import { ImageUp } from 'lucide-react';
import { cn } from 'cn';
import { Thumb } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@resourcepackbuilder/ui/components/item';
import { assignTextureReference } from '../../../commands/items';
import { isVanillaReference } from '@resourcepackbuilder/core/minecraft/resourceLocation';
import { usePngPicker } from '../../../hooks/useFileReaders';

interface TextureReferenceCardProps {
  itemId: string;
  /** The texture key in the model (without the leading #). */
  textureKey: string;
  /** The referenced texture, e.g. "minecraft:item/stick". */
  reference: string;
}

/** A texture the model takes from elsewhere: Minecraft's own textures work, others are missing in the pack. */
export function TextureReferenceCard({ itemId, textureKey, reference }: TextureReferenceCardProps) {
  const t = useTranslations('item');
  const pickPng = usePngPicker();
  const isVanilla = isVanillaReference(reference);
  const assign = async () => {
    const png = await pickPng();
    if (png) assignTextureReference(itemId, reference, png.name, png.dataUrl);
  };
  return (
    <Item variant="muted" className={cn('flex-nowrap items-start gap-3 border-border p-3', !isVanilla && 'border-destructive')}>
      <ItemMedia>
        <Thumb fallback={<ImageUp className="size-5.5 opacity-60" />} />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-1.5">
        <ItemTitle className="font-mono text-xs font-bold">#{textureKey}</ItemTitle>
        <ItemDescription className="line-clamp-none text-xs break-all">
          {reference} {isVanilla ? t('model.texture.minecraftTexture') : t('model.texture.notInPack')}
        </ItemDescription>
        <Button variant="outline" size="sm" className="self-start" onClick={() => void assign()}>
          <ImageUp /> {t('model.texture.assignOwnPng')}
        </Button>
      </ItemContent>
    </Item>
  );
}
