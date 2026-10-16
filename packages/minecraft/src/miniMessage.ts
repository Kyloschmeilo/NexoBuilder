/**
 * Simplified MiniMessage parser (colors, gradients, decorations, legacy codes) as used by Nexo for
 * itemname and lore. It produces styled segments; rendering is up to the UI.
 */

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

const LEGACY_COLORS: Record<string, string> = {
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

const LEGACY_DECORATIONS: Record<string, string> = {
  l: '<bold>',
  o: '<italic>',
  n: '<underlined>',
  m: '<strikethrough>',
  k: '<obfuscated>',
  r: '<reset>',
};

export interface MiniMessageStyle {
  color?: string;
  gradient?: string[];
  rainbow?: boolean;
  bold?: boolean;
  italic?: boolean;
  underlined?: boolean;
  strikethrough?: boolean;
  obfuscated?: boolean;
}

type Decoration = 'bold' | 'italic' | 'underlined' | 'strikethrough' | 'obfuscated';

export interface MiniMessageSegment {
  text: string;
  style: MiniMessageStyle;
}

const DECORATIONS: Record<string, Decoration> = {
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

function parseColor(value: string): string | undefined {
  const named = NAMED_COLORS[value.toLowerCase()];
  if (named) return named;
  return /^#[0-9a-f]{6}$/i.test(value) ? value : undefined;
}

/** Style after opening the tag `name` with `args`, or null for unknown tags (e.g. <glyph:…>). */
function applyTag(style: MiniMessageStyle, raw: string, name: string, args: string[]): MiniMessageStyle | null {
  if (name.startsWith('!') && DECORATIONS[name.slice(1)]) return { ...style, [DECORATIONS[name.slice(1)]]: false };
  if (DECORATIONS[name]) return { ...style, [DECORATIONS[name]]: args[0] !== 'false' };
  if (name === 'color' || name === 'c' || name === 'colour') {
    const color = parseColor(args[0] ?? '');
    return color ? { ...style, color, gradient: undefined, rainbow: false } : null;
  }
  if (name === 'gradient') {
    const colors = args.map(parseColor).filter((c): c is string => !!c);
    if (colors.length === 0) return null;
    return { ...style, gradient: colors.length === 1 ? [colors[0], colors[0]] : colors, rainbow: false };
  }
  if (name === 'rainbow') return { ...style, rainbow: true, gradient: undefined };
  const color = parseColor(raw);
  return color ? { ...style, color, gradient: undefined, rainbow: false } : null;
}

/** Splits a MiniMessage text into formatted segments. */
export function parseMiniMessage(input: string): MiniMessageSegment[] {
  const text = input.replace(/[&§]([0-9a-fk-or])/gi, (_, code: string) => {
    const c = code.toLowerCase();
    return LEGACY_COLORS[c] ? `<${LEGACY_COLORS[c]}>` : (LEGACY_DECORATIONS[c] ?? '');
  });
  const segments: MiniMessageSegment[] = [];
  const stack: Array<{ name: string; previous: MiniMessageStyle }> = [];
  let style: MiniMessageStyle = {};
  const push = (part: string) => {
    if (part) segments.push({ text: part, style: { ...style } });
  };
  const tagRe = /<(\/?)([!#a-z_0-9:.-]+)>/gi;
  let last = 0;
  for (const match of text.matchAll(tagRe)) {
    push(text.slice(last, match.index));
    last = match.index + match[0].length;
    const closing = match[1] === '/';
    const raw = match[2];
    const [tagName, ...args] = raw.split(':');
    const name = tagName.toLowerCase();
    if (closing) {
      // Closes the matching tag and all tags opened after it
      const index = stack.map((s) => s.name).lastIndexOf(name);
      if (index >= 0) {
        style = stack[index].previous;
        stack.length = index;
      }
    } else if (name === 'reset') {
      style = {};
      stack.length = 0;
    } else {
      const next = applyTag(style, raw, name, args);
      if (next) {
        stack.push({ name, previous: style });
        style = next;
      }
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

/** Color at position `t` (0–1) of a gradient. */
export function gradientColorAt(colors: string[], t: number): string {
  if (colors.length === 1) return colors[0];
  const scaled = t * (colors.length - 1);
  const i = Math.min(Math.floor(scaled), colors.length - 2);
  return lerpColor(colors[i], colors[i + 1], scaled - i);
}
