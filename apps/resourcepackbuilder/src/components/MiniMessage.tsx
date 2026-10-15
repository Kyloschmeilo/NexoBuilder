/** Preview of MiniMessage texts (colours, gradients, decorations) as Nexo uses them for item names and lore. */
import type { CSSProperties, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import { gradientColorAt, parseMiniMessage, type MiniMessageStyle } from '@resourcepackbuilder/core/miniMessage';

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
export function MiniMessageLine({ text, fallbackColor = '#FFFFFF', defaultItalic = false }: MiniMessageLineProps) {
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

/**
 * Dark, Minecraft-tooltip-like box for MiniMessage lines. It always uses the dark theme tokens (scoped
 * `dark` class) because Minecraft text colours are designed for a dark background.
 */
export function MiniMessageBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'dark inline-block max-w-full min-w-40 rounded-sm border-2 border-input bg-background px-2.5 py-1.5 font-sans text-sm leading-5 text-foreground',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Tooltip-like preview of an item's name and lore. */
export function ItemTooltip({ name, lore }: { name: string; lore?: string[] }) {
  const t = useTranslations('ui');
  return (
    <MiniMessageBox>
      <MiniMessageLine text={name || t('miniMessage.unnamed')} />
      {lore?.map((line, i) => (
        <MiniMessageLoreLine key={i} text={line} />
      ))}
    </MiniMessageBox>
  );
}
