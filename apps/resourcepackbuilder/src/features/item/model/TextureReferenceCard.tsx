import { useTranslations } from 'next-intl';
import { ImageUp } from 'lucide-react';
import { cn } from 'cn';
import { pickFiles, Thumb } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@resourcepackbuilder/ui/components/item';
import { assignTextureReference } from '../../../commands/items';
import { PNG_ACCEPT, usePngReader } from '../usePngReader';

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
  const readPng = usePngReader();
  const isVanilla = !reference.includes(':') || reference.startsWith('minecraft:');
  const assign = async () => {
    const [file] = await pickFiles(PNG_ACCEPT, false);
    const png = file && (await readPng(file));
    if (png) assignTextureReference(itemId, reference, file.name, png.dataUrl);
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
