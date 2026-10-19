/** One model of a variant as a plain row: thumbnail, path suffix and file, with move / replace / remove. */
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, Box, RefreshCw, Trash2 } from 'lucide-react';
import type { ImportedModel } from '@resourcepackbuilder/minecraft';
import { IconButton, Thumb } from '@resourcepackbuilder/ui';
import { useThumbnail } from '../../../components/useThumbnail';
import { IssueCountBadges } from '../../../components/IssueCountBadges';

const THUMB_SIZE = 36;

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
  return (
    <div data-slot="variant-model" className="flex min-w-0 items-center gap-2.5">
      <Thumb size={THUMB_SIZE} src={thumb} fallback={<Box className="size-4 opacity-60" />} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          <code className="truncate font-mono text-label text-text">{label}</code>
          <IssueCountBadges issues={model.issues} />
        </span>
        <span className="truncate text-meta text-text-muted">{model.fileName}</span>
      </div>
      <div className="flex flex-none items-center">
        {position && (
          <>
            <IconButton
              label={t('variants.moveUp')}
              size="icon-sm"
              disabled={position.index === 0}
              onClick={() => onMove(position.index - 1)}
            >
              <ArrowUp />
            </IconButton>
            <IconButton
              label={t('variants.moveDown')}
              size="icon-sm"
              disabled={position.index === position.count - 1}
              onClick={() => onMove(position.index + 1)}
            >
              <ArrowDown />
            </IconButton>
          </>
        )}
        <IconButton label={t('model.replace')} size="icon-sm" onClick={onReplace}>
          <RefreshCw />
        </IconButton>
        <IconButton label={tCommon('remove')} size="icon-sm" variant="ghost-destructive" onClick={onRemove}>
          <Trash2 />
        </IconButton>
      </div>
    </div>
  );
}
