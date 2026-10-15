import { useTranslations } from 'next-intl';
import { MiniMessageBox } from './MiniMessageBox';
import { MiniMessageLine, MiniMessageLoreLine } from './MiniMessageLine';

/** Tooltip-like preview of an item's name and lore. */
export function ItemTooltip({ name, lore }: { name: string; lore: readonly string[] }) {
  const t = useTranslations('editor');
  return (
    <MiniMessageBox>
      <MiniMessageLine text={name || t('miniMessage.unnamed')} />
      {lore.map((line, i) => (
        <MiniMessageLoreLine key={i} text={line} />
      ))}
    </MiniMessageBox>
  );
}
