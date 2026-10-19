/** The rendered preview of a MiniMessage text as a compact chip, dark like Minecraft's tooltip. */
import { MiniMessageBox } from '../../miniMessage/MiniMessageBox';
import { MiniMessageLine, MiniMessageLoreLine } from '../../miniMessage/MiniMessageLine';
import { useFieldContext } from '../fieldContext';

/** One line, or several lore lines (lore defaults to purple italic, as in game). */
export function MiniMessageChip({ text, lines }: { text?: string; lines?: readonly string[] }) {
  const { previewText } = useFieldContext();
  const shown = (line: string) => (previewText ? previewText(line) : line);
  return (
    <MiniMessageBox className="min-w-0 self-start px-2 py-0.5">
      {text !== undefined && <MiniMessageLine text={shown(text)} />}
      {lines?.map((line, i) => (
        // Lines have no identity of their own; their order is their key
        <MiniMessageLoreLine key={i} text={shown(line)} />
      ))}
    </MiniMessageBox>
  );
}
