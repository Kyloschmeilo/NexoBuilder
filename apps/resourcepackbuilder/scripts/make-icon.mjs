/**
 * Generates build/icon.png (512×512), the app icon for the Windows program.
 * Usage: npm run icon (or node scripts/make-icon.mjs from anywhere)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
// The repo's shared PNG encoder (CommonJS, so it also works from plain node)
import { encodePng } from '../../../packages/core/test-utils/pngEncoder.cjs';

const OUTPUT = new URL('../build/icon.png', import.meta.url);

const SIZE = 512;
const SS = 4; // supersampling for smooth edges
const scale = SIZE / 32;

// Logo shape from the favicon (32×32): slightly rounded square + "R" (CastCrafter: flat, no gradient)
const toPx = (points) => points.map(([x, y]) => [x * scale, y * scale]);
const R = toPx([
  [9, 23],
  [9, 9],
  [19.5, 9],
  [23, 12.5],
  [23, 15],
  [21, 17.4],
  [23.6, 23],
  [19.9, 23],
  [17.4, 18.2],
  [12.4, 18.2],
  [12.4, 23],
]);
const R_HOLE = toPx([
  [12.4, 12],
  [18.6, 12],
  [19.6, 13],
  [19.6, 14.4],
  [18.6, 15.2],
  [12.4, 15.2],
]);

function inPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inRoundedRect(x, y) {
  const r = 4.5 * scale;
  const cx = Math.min(Math.max(x, r), SIZE - r);
  const cy = Math.min(Math.max(y, r), SIZE - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

const ACCENT = [0x1f, 0xbf, 0x7a];
const ON_ACCENT = [0x04, 0x13, 0x0c];
/** Colour of one pixel: the accent rounded square with the "R", supersampled for smooth edges. */
function pixel(x, y) {
  let bg = 0;
  let fg = 0;
  for (let sy = 0; sy < SS; sy++) {
    for (let sx = 0; sx < SS; sx++) {
      const px = x + (sx + 0.5) / SS;
      const py = y + (sy + 0.5) / SS;
      if (inRoundedRect(px, py)) {
        bg++;
        if (inPolygon(px, py, R) && !inPolygon(px, py, R_HOLE)) fg++;
      }
    }
  }
  const f = bg ? fg / bg : 0;
  const color = ACCENT.map((c, i) => Math.round(c * (1 - f) + ON_ACCENT[i] * f));
  return [...color, Math.round((bg / (SS * SS)) * 255)];
}

const png = encodePng(SIZE, SIZE, pixel, { level: 9 });
mkdirSync(new URL('.', OUTPUT), { recursive: true });
writeFileSync(OUTPUT, png);
console.log('build/icon.png written', png.length, 'bytes');
