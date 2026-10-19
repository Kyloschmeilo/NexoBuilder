/**
 * One texture of the model as a tile: thumbnail, name (renamed in place), size and frames, replace, and the animation
 * of its .mcmeta (animated, ticks per frame, smooth).
 */
import { type ReactNode, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImageUp, Pencil } from 'lucide-react';
import { cn } from '@resourcepackbuilder/ui/cn';
import { DEFAULT_ANIMATION_FRAMETIME, getAnimation, getFrameSize, type ModelTexture } from '@resourcepackbuilder/minecraft';
import { IconButton, Thumb } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { Switch } from '@resourcepackbuilder/ui/components/switch';
import { setTextureAnimation, updateModelTexture } from '../../../commands/items';
import { NumberInput } from '../../../components/editor';
import { usePngPicker } from '../../../hooks/useFileReaders';

const THUMB_SIZE = 48;

/** The tile frame shared by the model's own textures and the referenced ones. */
export function TextureTile({ invalid, className, children }: { invalid?: boolean; className?: string; children: ReactNode }) {
  return (
    <div
      data-slot="texture-tile"
      data-invalid={invalid || undefined}
      className={cn('flex min-w-0 items-start gap-3 rounded-lg border border-line p-2.5', invalid && 'border-danger', className)}
    >
      {children}
    </div>
  );
}

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
    <div className="flex min-h-7 min-w-0 items-center gap-1">
      <span className="truncate font-mono text-label font-medium text-text">{texture.name}.png</span>
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-meta text-text-muted">
      <label htmlFor={animatedId} className="flex cursor-pointer items-center gap-1.5">
        <Switch
          id={animatedId}
          size="sm"
          checked={!!animation}
          onCheckedChange={(checked) =>
            setTextureAnimation(itemId, texture.id, checked ? { frametime: DEFAULT_ANIMATION_FRAMETIME, interpolate: false } : null)
          }
        />
        {t('model.texture.animated')}
      </label>
      {animation && (
        <>
          <span className="flex items-center gap-1.5">
            {t('model.texture.ticksPerFrame')}
            <NumberInput
              className="w-16"
              value={animation.frametime}
              integer
              min={1}
              label={t('model.texture.ticksPerFrame')}
              onChange={(frametime) =>
                setTextureAnimation(itemId, texture.id, { frametime: frametime ?? 1, interpolate }, `texture:${texture.id}:frametime`)
              }
            />
          </span>
          <label htmlFor={smoothId} className="flex cursor-pointer items-center gap-1.5">
            <Switch
              id={smoothId}
              size="sm"
              checked={interpolate}
              onCheckedChange={(checked) =>
                setTextureAnimation(itemId, texture.id, { frametime: animation.frametime, interpolate: checked })
              }
            />
            {t('model.texture.interpolate')}
          </label>
        </>
      )}
    </div>
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
    <TextureTile invalid={!texture.dataUrl}>
      <Thumb size={THUMB_SIZE} src={texture.dataUrl} alt={texture.name} fallback={<ImageUp className="size-5 opacity-60" />} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-1">
          <div className="min-w-0 flex-1">
            <TextureName itemId={itemId} texture={texture} />
          </div>
          <Button variant="ghost" size="sm" onClick={() => void replace()}>
            <ImageUp /> {texture.dataUrl ? t('model.replace') : t('model.texture.assignPng')}
          </Button>
        </div>
        <span className={cn('text-meta', texture.dataUrl ? 'text-text-muted' : 'text-danger')}>
          {texture.dataUrl ? t('model.texture.size', { width: texture.width, height: texture.height }) : t('model.texture.missing')}
          {animation && ` · ${t('model.texture.frames', { count: getFrameSize(texture).count })}`}
          {!isUsed && ` · ${t('model.texture.particleOnly')}`}
        </span>
        <TextureAnimationOptions itemId={itemId} texture={texture} />
      </div>
    </TextureTile>
  );
}
