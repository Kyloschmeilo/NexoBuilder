/** Preview of MiniMessage text (colours, gradients, decorations) as Nexo uses them for item names and lore. */
import type { CSSProperties, ReactNode } from 'react';
import { gradientColorAt, parseMiniMessage, type MiniMessageStyle } from '@resourcepackbuilder/minecraft';

/** Minecraft's default colour of item names (white). */
const NAME_COLOR = '#FFFFFF';
/** Minecraft's default lore colour (dark purple). */
const LORE_COLOR = '#AA00AA';

function cssFor(style: MiniMessageStyle, fallbackColor: string, defaultItalic: boolean): CSSProperties {
  const decorations = [style.underlined && 'underline', style.strikethrough && 'line-through'].filter(Boolean).join(' ');
  return {
    color: style.color ?? fallbackColor,
    fontWeight: style.bold ? 700 : undefined,
    fontStyle: (style.italic ?? defaultItalic) ? 'italic' : undefined,
    textDecoration: decorations || undefined,
  };
}

/** Colour of character `index` of `count` in a gradient or rainbow segment (undefined for plain segments). */
function characterColor(style: MiniMessageStyle, index: number, count: number): string | undefined {
  if (style.rainbow) return `hsl(${Math.round((index / Math.max(1, count)) * 360)}, 90%, 62%)`;
  if (style.gradient) return gradientColorAt(style.gradient, index / Math.max(1, count - 1));
  return undefined;
}

interface MiniMessageLineProps {
  text: string;
  /** Colour of text without a colour tag (Minecraft: white for names, dark purple for lore). */
  fallbackColor?: string;
  /** Lore is italic unless a tag says otherwise. */
  defaultItalic?: boolean;
}

/** Renders one line of MiniMessage. */
export function MiniMessageLine({ text, fallbackColor = NAME_COLOR, defaultItalic = false }: MiniMessageLineProps) {
  const nodes: ReactNode[] = [];
  parseMiniMessage(text).forEach((segment, i) => {
    const className = segment.style.obfuscated ? 'blur-[1.5px]' : undefined;
    if (!segment.style.gradient && !segment.style.rainbow) {
      nodes.push(
        <span key={i} style={cssFor(segment.style, fallbackColor, defaultItalic)} className={className}>
          {segment.text}
        </span>,
      );
      return;
    }
    const chars = [...segment.text];
    chars.forEach((char, j) => {
      const color = characterColor(segment.style, j, chars.length);
      nodes.push(
        <span key={`${i}-${j}`} style={cssFor({ ...segment.style, color }, fallbackColor, defaultItalic)} className={className}>
          {char}
        </span>,
      );
    });
  });
  return <div className="min-h-[1.4em] break-words whitespace-pre-wrap">{nodes.length ? nodes : ' '}</div>;
}

/** A lore line: dark purple and italic by default, like in Minecraft. */
export function MiniMessageLoreLine({ text }: { text: string }) {
  return <MiniMessageLine text={text} fallbackColor={LORE_COLOR} defaultItalic />;
}
