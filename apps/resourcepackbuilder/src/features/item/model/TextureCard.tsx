import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImageUp, Pencil } from 'lucide-react';
import { cn } from 'cn';
import type { ModelTexture } from '@resourcepackbuilder/core/model/types';
import { DEFAULT_ANIMATION_FRAMETIME, getAnimation, getFrameSize } from '@resourcepackbuilder/core/model/textures';
import { IconButton, Thumb } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Item, ItemContent, ItemMedia } from '@resourcepackbuilder/ui/components/item';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { Label } from '@resourcepackbuilder/ui/components/label';
import { setTextureAnimation, updateModelTexture } from '../../../commands/items';
import { NumberInput } from '../../../components/editor';
import { usePngPicker } from '../../../hooks/useFileReaders';

/** The texture name, editable in place. */
function TextureName({ itemId, texture }: { itemId: string; texture: ModelTexture }) {
  const tCommon = useTranslations('common');
  const [isEditing, setIsEditing] = useState(false);
  if (isEditing) {
    return (
      <Input
        className="h-7"
        autoFocus
        aria-label={tCommon('rename')}
        defaultValue={texture.name}
        onBlur={(e) => {
          const name = e.target.value.trim();
          if (name) {
            updateModelTexture(itemId, texture.id, (draft) => {
              draft.name = name;
            });
          }
          setIsEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-1">
      <strong className="truncate text-foreground">{texture.name}.png</strong>
      <IconButton label={tCommon('rename')} size="icon-xs" onClick={() => setIsEditing(true)}>
        <Pencil />
      </IconButton>
    </div>
  );
}

/** Animated / ticks per frame / smooth – the animation part of the texture's .mcmeta. */
function TextureAnimationOptions({ itemId, texture }: { itemId: string; texture: ModelTexture }) {
  const t = useTranslations('item');
  const animatedId = useId();
  const smoothId = useId();
  const animation = getAnimation(texture);
  const interpolate = !!animation?.interpolate;
  return (
    <>
      <div className="flex items-center gap-1.5">
        <Checkbox
          id={animatedId}
          checked={!!animation}
          onCheckedChange={(checked) =>
            setTextureAnimation(itemId, texture.id, checked ? { frametime: DEFAULT_ANIMATION_FRAMETIME, interpolate: false } : null)
          }
        />
        <Label htmlFor={animatedId} className="cursor-pointer text-xs font-normal text-foreground">
          {t('model.texture.animated')}
        </Label>
      </div>
      {animation && (
        <div className="flex basis-full flex-wrap items-center gap-1.5">
          <span>{t('model.texture.ticksPerFrame')}</span>
          <NumberInput
            className="w-16"
            value={animation.frametime}
            integer
            min={1}
            onChange={(frametime) =>
              setTextureAnimation(itemId, texture.id, { frametime: frametime ?? 1, interpolate }, `texture:${texture.id}:frametime`)
            }
          />
          <Checkbox
            id={smoothId}
            checked={interpolate}
            onCheckedChange={(checked) => setTextureAnimation(itemId, texture.id, { frametime: animation.frametime, interpolate: checked })}
          />
          <Label htmlFor={smoothId} className="cursor-pointer text-xs font-normal text-foreground">
            {t('model.texture.interpolate')}
          </Label>
        </div>
      )}
    </>
  );
}

/** One texture of the model: preview, size and frames, replace and animation settings. */
export function TextureCard({ itemId, texture, isUsed }: { itemId: string; texture: ModelTexture; isUsed: boolean }) {
  const t = useTranslations('item');
  const pickPng = usePngPicker();
  const animation = getAnimation(texture);
  const replace = async () => {
    const png = await pickPng();
    if (!png) return;
    updateModelTexture(itemId, texture.id, (draft) => {
      draft.dataUrl = png.dataUrl;
      draft.width = png.width;
      draft.height = png.height;
    });
  };
  return (
    <Item variant="muted" className={cn('flex-nowrap items-start gap-3 border-border p-3', !texture.dataUrl && 'border-destructive')}>
      <ItemMedia>
        <Thumb src={texture.dataUrl} alt={texture.name} fallback={<ImageUp className="size-5.5 opacity-60" />} />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-1.5 text-xs text-muted-foreground">
        <TextureName itemId={itemId} texture={texture} />
        <span>
          {texture.dataUrl ? t('model.texture.size', { width: texture.width, height: texture.height }) : t('model.texture.missing')}
          {animation && ` · ${t('model.texture.frames', { count: getFrameSize(texture).count })}`}
          {!isUsed && ` · ${t('model.texture.particleOnly')}`}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => void replace()}>
            <ImageUp /> {texture.dataUrl ? t('model.replace') : t('model.texture.assignPng')}
          </Button>
          <TextureAnimationOptions itemId={itemId} texture={texture} />
        </div>
      </ItemContent>
    </Item>
  );
}
