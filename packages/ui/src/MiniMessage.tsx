/**
 * Vereinfachte Vorschau für MiniMessage-Texte (Farben, Verläufe, Formatierungen),
 * wie sie in Nexo für itemname und lore verwendet werden.
 */
import type { CSSProperties, ReactNode } from 'react';

const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  dark_blue: '#0000AA',
  dark_green: '#00AA00',
  dark_aqua: '#00AAAA',
  dark_red: '#AA0000',
  dark_purple: '#AA00AA',
  gold: '#FFAA00',
  gray: '#AAAAAA',
  grey: '#AAAAAA',
  dark_gray: '#555555',
  dark_grey: '#555555',
  blue: '#5555FF',
  green: '#55FF55',
  aqua: '#55FFFF',
  red: '#FF5555',
  light_purple: '#FF55FF',
  yellow: '#FFFF55',
  white: '#FFFFFF',
};

const LEGACY: Record<string, string> = {
  '0': 'black',
  '1': 'dark_blue',
  '2': 'dark_green',
  '3': 'dark_aqua',
  '4': 'dark_red',
  '5': 'dark_purple',
  '6': 'gold',
  '7': 'gray',
  '8': 'dark_gray',
  '9': 'blue',
  a: 'green',
  b: 'aqua',
  c: 'red',
  d: 'light_purple',
  e: 'yellow',
  f: 'white',
};

interface Style {
  color?: string;
  gradient?: string[];
  rainbow?: boolean;
  bold?: boolean;
  italic?: boolean;
  underlined?: boolean;
  strikethrough?: boolean;
  obfuscated?: boolean;
}

interface Segment {
  text: string;
  style: Style;
}

function parseColor(value: string): string | undefined {
  const v = value.toLowerCase();
  if (NAMED_COLORS[v]) return NAMED_COLORS[v];
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  return undefined;
}

const DECORATIONS: Record<string, keyof Style> = {
  bold: 'bold',
  b: 'bold',
  italic: 'italic',
  i: 'italic',
  em: 'italic',
  underlined: 'underlined',
  u: 'underlined',
  strikethrough: 'strikethrough',
  st: 'strikethrough',
  obfuscated: 'obfuscated',
  obf: 'obfuscated',
};

/** Zerlegt einen MiniMessage-Text in formatierte Abschnitte. */
export function parseMiniMessage(input: string): Segment[] {
  // Legacy-Codes (&a, §c) in Tags umwandeln
  const text = input.replace(/[&§]([0-9a-fk-or])/gi, (_, code: string) => {
    const c = code.toLowerCase();
    if (LEGACY[c]) return `<${LEGACY[c]}>`;
    return { l: '<bold>', o: '<italic>', n: '<underlined>', m: '<strikethrough>', k: '<obfuscated>', r: '<reset>' }[c] ?? '';
  });
  const segments: Segment[] = [];
  const stack: Array<{ name: string; previous: Style }> = [];
  let style: Style = {};
  const tagRe = /<(\/?)([!#a-z_0-9:.-]+)>/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  const push = (t: string) => {
    if (t) segments.push({ text: t, style: { ...style } });
  };
  while ((m = tagRe.exec(text))) {
    push(text.slice(last, m.index));
    last = tagRe.lastIndex;
    const closing = m[1] === '/';
    const raw = m[2];
    const [name, ...args] = raw.split(':');
    const lower = name.toLowerCase();
    if (closing) {
      // Schließt den passenden Tag (und alle danach geöffneten)
      let idx = -1;
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k].name === lower) {
          idx = k;
          break;
        }
      }
      if (idx >= 0) {
        style = stack[idx].previous;
        stack.length = idx;
      }
      continue;
    }
    if (lower === 'reset') {
      style = {};
      stack.length = 0;
      continue;
    }
    let next: Style | null = null;
    if (lower.startsWith('!') && DECORATIONS[lower.slice(1)]) {
      next = { ...style, [DECORATIONS[lower.slice(1)]]: false };
    } else if (DECORATIONS[lower]) {
      next = { ...style, [DECORATIONS[lower]]: args[0] !== 'false' };
    } else if (lower === 'color' || lower === 'c' || lower === 'colour') {
      const color = parseColor(args[0] ?? '');
      if (color) next = { ...style, color, gradient: undefined, rainbow: false };
    } else if (lower === 'gradient') {
      const colors = args.map(parseColor).filter((c): c is string => !!c);
      if (colors.length >= 1) next = { ...style, gradient: colors.length === 1 ? [colors[0], colors[0]] : colors, rainbow: false };
    } else if (lower === 'rainbow') {
      next = { ...style, rainbow: true, gradient: undefined };
    } else {
      const color = parseColor(raw);
      if (color) next = { ...style, color, gradient: undefined, rainbow: false };
    }
    // Unbekannte Tags (z.B. <glyph:…>, <shift:…>) bleiben unsichtbar
    if (next) {
      stack.push({ name: lower, previous: style });
      style = next;
    }
  }
  push(text.slice(last));
  return segments;
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function gradientAt(colors: string[], t: number): string {
  if (colors.length === 1) return colors[0];
  const scaled = t * (colors.length - 1);
  const i = Math.min(Math.floor(scaled), colors.length - 2);
  return lerpColor(colors[i], colors[i + 1], scaled - i);
}

function cssFor(style: Style, fallbackColor: string, defaultItalic = false): CSSProperties {
  const decorations = [style.underlined && 'underline', style.strikethrough && 'line-through'].filter(Boolean).join(' ');
  return {
    color: style.color ?? fallbackColor,
    fontWeight: style.bold ? 700 : undefined,
    fontStyle: (style.italic ?? defaultItalic) ? 'italic' : undefined,
    textDecoration: decorations || undefined,
  };
}

/** Rendert eine Zeile MiniMessage. */
export function MiniMessageLine({
  text,
  fallbackColor = '#FFFFFF',
  defaultItalic = false,
}: {
  text: string;
  fallbackColor?: string;
  defaultItalic?: boolean;
}) {
  const segments = parseMiniMessage(text);
  const totalGradientChars = (s: Segment) => [...s.text].length;
  const nodes: ReactNode[] = [];
  segments.forEach((seg, i) => {
    if (seg.style.gradient || seg.style.rainbow) {
      const chars = [...seg.text];
      const n = Math.max(1, totalGradientChars(seg) - 1);
      chars.forEach((ch, j) => {
        const color = seg.style.rainbow ? `hsl(${Math.round((j / Math.max(1, chars.length)) * 360)}, 90%, 62%)` : gradientAt(seg.style.gradient!, j / n);
        nodes.push(
          <span key={`${i}-${j}`} style={cssFor({ ...seg.style, color }, fallbackColor, defaultItalic)} className={seg.style.obfuscated ? 'obf' : undefined}>
            {ch}
          </span>,
        );
      });
    } else {
      nodes.push(
        <span key={i} style={cssFor(seg.style, fallbackColor, defaultItalic)} className={seg.style.obfuscated ? 'obf' : undefined}>
          {seg.text}
        </span>,
      );
    }
  });
  return <div className="line">{nodes.length ? nodes : ' '}</div>;
}

/** Tooltip-ähnliche Vorschau aus Name und Lore. */
export function ItemTooltip({ name, lore }: { name: string; lore?: string[] }) {
  return (
    <div className="mc-text">
      <MiniMessageLine text={name || 'Unbenannt'} />
      {lore?.map((line, i) => (
        <MiniMessageLine key={i} text={line} fallbackColor="#AA00AA" defaultItalic />
      ))}
    </div>
  );
}

export function stripMiniMessage(text: string): string {
  return parseMiniMessage(text)
    .map((s) => s.text)
    .join('');
}
