import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IconButton } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';

interface ListControlsProps {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}

/** Move up / move down / remove buttons of a list row. */
export function ListControls({ index, count, onMove, onRemove }: ListControlsProps) {
  const t = useTranslations('editor');
  const tCommon = useTranslations('common');
  return (
    <>
      <IconButton label={t('inputs.moveUp')} disabled={index === 0} onClick={() => onMove(index, index - 1)}>
        <ArrowUp />
      </IconButton>
      <IconButton label={t('inputs.moveDown')} disabled={index === count - 1} onClick={() => onMove(index, index + 1)}>
        <ArrowDown />
      </IconButton>
      <IconButton label={tCommon('remove')} tone="destructive" onClick={onRemove}>
        <Trash2 />
      </IconButton>
    </>
  );
}

/** "+ Add …" button below a list. */
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" className="self-start" onClick={onClick}>
      <Plus /> {label}
    </Button>
  );
}
