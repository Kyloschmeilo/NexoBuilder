/**
 * The desktop window's background before the UI paints must match the canvas of the default colour theme, or the
 * window flashes another colour on start.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEFAULT_COLOR_THEME } from './colorThemes';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const STYLES = read('../../../../packages/ui/src/styles.css');
const MAIN = read('../../electron/src/main.ts');

/** `--canvas` of the first palette rule whose selector list contains `selector`. */
function canvasOf(selector: string): string | undefined {
  for (const match of STYLES.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const selectors = match[1]!.split(',').map((s) => s.trim());
    if (selectors.includes(selector)) {
      const canvas = /--canvas:\s*(#[0-9a-fA-F]{6})/.exec(match[2]!)?.[1];
      if (canvas) return canvas.toLowerCase();
    }
  }
  return undefined;
}

describe('window background', () => {
  it('matches the default theme’s canvas in light and dark', () => {
    const background = /const BACKGROUND = \{ light: '(#[0-9a-f]{6})', dark: '(#[0-9a-f]{6})' \}/.exec(MAIN);
    expect(background).not.toBeNull();
    expect(background?.[1]).toBe(canvasOf(`[data-color-theme='${DEFAULT_COLOR_THEME}']`));
    expect(background?.[2]).toBe(canvasOf(`.dark[data-color-theme='${DEFAULT_COLOR_THEME}']`));
  });
});
