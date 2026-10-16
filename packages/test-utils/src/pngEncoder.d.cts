/** Encodes `width`×`height` pixels as a PNG; `pixel(x, y)` returns [r, g, b, a] (0–255). */
export function encodePng(
  width: number,
  height: number,
  pixel: (x: number, y: number) => ArrayLike<number>,
  options?: { level?: number },
): Buffer;
