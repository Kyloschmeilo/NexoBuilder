import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, Box, RefreshCw, Trash2 } from 'lucide-react';
import type { ImportedModel } from '@resourcepackbuilder/core/model/types';
import { IconButton, Thumb } from '@resourcepackbuilder/ui';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@resourcepackbuilder/ui/components/item';
import { useThumbnail } from '@resourcepackbuilder/preview';
import { IssueCountBadges } from '../../../components/IssueCountBadges';

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
  return (
    <Item variant="muted" size="xs" className="flex-nowrap gap-3 border-border p-2">
      <ItemMedia>
        <Thumb size={THUMB_SIZE} src={thumb} fallback={<Box className="size-4.5 opacity-60" />} />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5 text-xs">
        <ItemTitle className="font-mono text-xs font-normal">{label}</ItemTitle>
        <ItemDescription className="line-clamp-1">{model.fileName}</ItemDescription>
        <span className="flex flex-wrap gap-1 empty:hidden">
          <IssueCountBadges issues={model.issues} />
        </span>
      </ItemContent>
      <ItemActions className="shrink-0 flex-wrap justify-end gap-0">
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
        <IconButton label={tCommon('remove')} variant="ghost-destructive" onClick={onRemove}>
          <Trash2 />
        </IconButton>
      </ItemActions>
    </Item>
  );
}
