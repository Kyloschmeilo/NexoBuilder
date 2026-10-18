/** Preview of MiniMessage text (colours, gradients, decorations) as Nexo uses them for item names and lore. */
import type { CSSProperties, ReactNode } from 'react';
import { gradientColorAt, parseMiniMessage, type MiniMessageStyle } from '@resourcepackbuilder/minecraft';

/** Minecraft's default colour of item names (white). */
const NAME_COLOR = '#FFFFFF';
/** Minecraft's default lore colour (dark purple). */
const LORE_COLOR = '#AA00AA';

/**
 * A colour made readable on the page surface: its OKLCH lightness is clamped into the range the surrounding
 * {@link PAGE_TEXT_CLASS} sets for the theme (dark text on light themes, light text on dark ones), hue and chroma stay.
 */
function readableOnPage(color: string): string {
  return `oklch(from ${color} clamp(var(--mm-l-min), l, var(--mm-l-max)) c h)`;
}

/** Sets the lightness range of {@link readableOnPage} for the light and the dark themes. */
export const PAGE_TEXT_CLASS = '[--mm-l-min:0] [--mm-l-max:0.56] dark:[--mm-l-min:0.74] dark:[--mm-l-max:1]';

function cssFor(style: MiniMessageStyle, fallbackColor: string, defaultItalic: boolean, onPage: boolean): CSSProperties {
  const decorations = [style.underlined && 'underline', style.strikethrough && 'line-through'].filter(Boolean).join(' ');
  return {
    color: onPage ? (style.color ? readableOnPage(style.color) : undefined) : (style.color ?? fallbackColor),
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
  /**
   * Drawn on the page instead of a dark tooltip box: text without a colour tag takes the page's text colour, and tag
   * colours are clamped for contrast. Needs {@link PAGE_TEXT_CLASS} on an ancestor (see `MiniMessageTitle`).
   */
  onPage?: boolean;
  className?: string;
}

/** Renders one line of MiniMessage. */
export function MiniMessageLine({
  text,
  fallbackColor = NAME_COLOR,
  defaultItalic = false,
  onPage = false,
  className: lineClassName = 'min-h-[1.4em] break-words whitespace-pre-wrap',
}: MiniMessageLineProps) {
  const nodes: ReactNode[] = [];
  parseMiniMessage(text).forEach((segment, i) => {
    const className = segment.style.obfuscated ? 'blur-[1.5px]' : undefined;
    if (!segment.style.gradient && !segment.style.rainbow) {
      nodes.push(
        <span key={i} style={cssFor(segment.style, fallbackColor, defaultItalic, onPage)} className={className}>
          {segment.text}
        </span>,
      );
      return;
    }
    const chars = [...segment.text];
    chars.forEach((char, j) => {
      const color = characterColor(segment.style, j, chars.length);
      nodes.push(
        <span key={`${i}-${j}`} style={cssFor({ ...segment.style, color }, fallbackColor, defaultItalic, onPage)} className={className}>
          {char}
        </span>,
      );
    });
  });
  // On the page the line is inline content (a heading), in a tooltip box a block
  const Line = onPage ? 'span' : 'div';
  return <Line className={lineClassName}>{nodes.length ? nodes : ' '}</Line>;
}

/** A lore line: dark purple and italic by default, like in Minecraft. */
export function MiniMessageLoreLine({ text }: { text: string }) {
  return <MiniMessageLine text={text} fallbackColor={LORE_COLOR} defaultItalic />;
}

/**
 * A MiniMessage text drawn on the page, e.g. an item's name as a page title: colours are kept but clamped so they
 * stay readable on light and dark themes, and untagged text takes the page's text colour. It renders inline.
 */
export function MiniMessageTitle({ text }: { text: string }) {
  return (
    <span className={PAGE_TEXT_CLASS}>
      <MiniMessageLine text={text} onPage className="whitespace-pre" />
    </span>
  );
}
