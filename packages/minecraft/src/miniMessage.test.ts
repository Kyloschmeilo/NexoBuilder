import { describe, expect, it } from 'vitest';
import { gradientColorAt, parseMiniMessage } from './miniMessage';

describe('MiniMessage', () => {
  it('parses colors, decorations, legacy codes and closing tags', () => {
    expect(parseMiniMessage('<red>Rot<bold>Fett</bold></red>&aGrün')).toEqual([
      { text: 'Rot', style: { color: '#FF5555', gradient: undefined, rainbow: false } },
      { text: 'Fett', style: { color: '#FF5555', gradient: undefined, rainbow: false, bold: true } },
      { text: 'Grün', style: { color: '#55FF55', gradient: undefined, rainbow: false } },
    ]);
    expect(parseMiniMessage('<glyph:herz>x')).toEqual([{ text: 'x', style: {} }]);
    expect(gradientColorAt(['#000000', '#ffffff'], 0.5)).toBe('#808080');
  });
});
