import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, Box, RefreshCw, Trash2 } from 'lucide-react';
import type { ImportedModel } from '@resourcepackbuilder/core/model/types';
import { IconButton, Thumb } from '@resourcepackbuilder/ui';
import { useThumbnail } from '@resourcepackbuilder/preview';

const THUMB_SIZE = 44;

interface VariantModelRowProps {
  model: ImportedModel;
  /** The model's path suffix in the pack, e.g. "pulling_0". */
  label: string;
  /** Position in an ordered list; without it the row cannot be moved. */
  position?: { index: number; count: number };
  onMove: (to: number) => void;
  onReplace: () => void;
  onRemove: () => void;
}

/** One model of a variant: thumbnail, path suffix and file, with move / replace / remove. */
export function VariantModelRow({ model, label, position, onMove, onReplace, onRemove }: VariantModelRowProps) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  const thumb = useThumbnail(model);
  const errors = model.issues.filter((i) => i.level === 'error').length;
  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/50 p-2">
      <Thumb size={THUMB_SIZE} src={thumb} fallback={<Box className="size-4.5 opacity-60" />} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-xs">
        <span className="font-mono">{label}</span>
        <span className="truncate text-muted-foreground">
          {model.fileName}
          {errors > 0 && <span className="text-destructive"> · {t('editor.errors', { count: errors })}</span>}
        </span>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end">
        {position && (
          <>
            <IconButton label={t('variants.moveUp')} disabled={position.index === 0} onClick={() => onMove(position.index - 1)}>
              <ArrowUp />
            </IconButton>
            <IconButton
              label={t('variants.moveDown')}
              disabled={position.index === position.count - 1}
              onClick={() => onMove(position.index + 1)}
            >
              <ArrowDown />
            </IconButton>
          </>
        )}
        <IconButton label={t('model.replace')} onClick={onReplace}>
          <RefreshCw />
        </IconButton>
        <IconButton label={tCommon('remove')} tone="destructive" onClick={onRemove}>
          <Trash2 />
        </IconButton>
      </div>
    </div>
  );
}
