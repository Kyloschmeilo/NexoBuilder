import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COLOR_THEME_ATTRIBUTE, COLOR_THEME_BOOT_SCRIPT, COLOR_THEMES, DEFAULT_COLOR_THEME, isColorTheme } from './colorThemes';

const STYLES = readFileSync(fileURLToPath(new URL('../../../../packages/ui/src/styles.css', import.meta.url)), 'utf8');

/** The tokens every palette sets, in light and in dark. */
const PALETTE_TOKENS = [
  'canvas',
  'surface',
  'surface-raised',
  'surface-sunken',
  'line',
  'text',
  'text-muted',
  'accent',
  'accent-contrast',
] as const;

/** Runs the boot script against a fake `<html>` and storage; returns the attribute it set. */
function boot(storage: { getItem: (key: string) => string | null }): string | undefined {
  const attributes: Record<string, string> = {};
  const window = { localStorage: storage };
  const document = { documentElement: { setAttribute: (name: string, value: string) => (attributes[name] = value) } };
  new Function('window', 'document', COLOR_THEME_BOOT_SCRIPT)(window, document);
  return attributes[COLOR_THEME_ATTRIBUTE];
}

/** The declarations of the rule whose selector list is exactly `selector` (selectors joined by commas). */
function declarations(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/,\s*/g, ',\\s*');
  const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(STYLES);
  if (!match) throw new Error(`No rule for ${selector}`);
  return Object.fromEntries([...match[1].matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

/** The light and dark palette of a theme as written in styles.css. */
function palette(theme: string, mode: 'light' | 'dark'): Record<string, string> {
  if (theme === 'deepslate') {
    return mode === 'light'
      ? declarations(`:root, [data-color-theme='deepslate']`)
      : declarations(
          `.dark, .dark[data-color-theme='deepslate'], .dark [data-color-theme='deepslate'], [data-color-theme='deepslate'] .dark`,
        );
  }
  return mode === 'light'
    ? declarations(`[data-color-theme='${theme}']`)
    : declarations(`.dark[data-color-theme='${theme}'], .dark [data-color-theme='${theme}'], [data-color-theme='${theme}'] .dark`);
}

/** WCAG contrast ratio of two `#rrggbb` colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('colour theme boot script', () => {
  it('applies the stored theme', () => {
    expect(boot({ getItem: () => 'crimson' })).toBe('crimson');
  });

  it('falls back to the default for unknown or missing values', () => {
    expect(boot({ getItem: () => 'neon' })).toBe(DEFAULT_COLOR_THEME);
    expect(boot({ getItem: () => null })).toBe(DEFAULT_COLOR_THEME);
  });

  it('falls back to the default when storage throws', () => {
    expect(
      boot({
        getItem: () => {
          throw new Error('denied');
        },
      }),
    ).toBe(DEFAULT_COLOR_THEME);
  });
});

describe('isColorTheme', () => {
  it('accepts the theme ids only', () => {
    for (const theme of COLOR_THEMES) expect(isColorTheme(theme)).toBe(true);
    expect(isColorTheme('dark')).toBe(false);
    expect(isColorTheme(undefined)).toBe(false);
  });
});

describe.each(COLOR_THEMES.flatMap((theme) => (['light', 'dark'] as const).map((mode) => ({ theme, mode }))))(
  'styles.css palette $theme ($mode)',
  ({ theme, mode }) => {
    const tokens = palette(theme, mode);

    it('sets every palette token', () => {
      for (const token of PALETTE_TOKENS) expect(tokens[token], token).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('keeps muted text readable (at least 4.5:1) on canvas and surfaces', () => {
      for (const background of ['canvas', 'surface', 'surface-raised', 'surface-sunken']) {
        expect(contrast(tokens['text-muted'], tokens[background]), background).toBeGreaterThanOrEqual(4.5);
      }
    });

    it('keeps the accent readable (at least 4.5:1) on the surface and its contrast colour on the accent', () => {
      expect(contrast(tokens.accent, tokens.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens['accent-contrast'], tokens.accent)).toBeGreaterThanOrEqual(4.5);
    });
  },
);
