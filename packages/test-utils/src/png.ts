/** Test helper: creates real PNG files (Node only – outside src, so the package never ships it). */
import { encodePng } from './pngEncoder.cjs';

export function makePng(width: number, height: number, rgba: [number, number, number, number] = [255, 0, 0, 255]): Uint8Array {
  return new Uint8Array(encodePng(width, height, () => rgba));
}

export function makePngDataUrl(width: number, height: number, rgba?: [number, number, number, number]): string {
  return 'data:image/png;base64,' + Buffer.from(makePng(width, height, rgba)).toString('base64');
}
