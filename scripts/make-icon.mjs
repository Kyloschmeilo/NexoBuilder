/**
 * Erzeugt build/icon.png (512×512) – das App-Icon für das Windows-Programm.
 * Aufruf: node scripts/make-icon.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const SIZE = 512;
const SS = 4; // Supersampling für glatte Kanten
const scale = SIZE / 32;

// Logo-Form aus dem Favicon (32×32): abgerundetes Quadrat + „N“
const N = [
  [9, 23], [9, 9], [12.2, 9], [19.6, 18.4], [19.6, 9], [23, 9], [23, 23], [19.9, 23], [12.4, 13.5], [12.4, 23],
].map(([x, y]) => [x * scale, y * scale]);

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
  const r = 7 * scale;
  const cx = Math.min(Math.max(x, r), SIZE - r);
  const cy = Math.min(Math.max(y, r), SIZE - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

const from = [0x7c, 0x5c, 0xff];
const to = [0x4f, 0xc3, 0xff];
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  for (let x = 0; x < SIZE; x++) {
    let bg = 0;
    let fg = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS;
        const py = y + (sy + 0.5) / SS;
        if (inRoundedRect(px, py)) {
          bg++;
          if (inPolygon(px, py, N)) fg++;
        }
      }
    }
    const samples = SS * SS;
    const t = (x + y) / (2 * SIZE);
    const base = from.map((c, i) => c + (to[i] - c) * t);
    const f = bg ? fg / bg : 0;
    const color = base.map((c) => Math.round(c * (1 - f) + 255 * f));
    const o = y * (SIZE * 4 + 1) + 1 + x * 4;
    raw[o] = color[0];
    raw[o + 1] = color[1];
    raw[o + 2] = color[2];
    raw[o + 3] = Math.round((bg / samples) * 255);
  }
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b) => {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
mkdirSync('build', { recursive: true });
writeFileSync('build/icon.png', png);
console.log('build/icon.png geschrieben', png.length, 'Bytes');
