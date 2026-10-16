/** GIF header reading. */
import { dataUrlHead } from './dataUrl';

export interface GifInfo {
  width: number;
  height: number;
}

/** Signature (GIF87a/GIF89a) + logical screen width + height */
const HEADER_BYTES = 10;

/** Reads width/height from a GIF header; null if the data URL is no GIF. */
export function readGifInfoFromDataUrl(dataUrl: string): GifInfo | null {
  const bytes = dataUrl.startsWith('data:image/gif') ? dataUrlHead(dataUrl, HEADER_BYTES) : null;
  if (!bytes || bytes.length < HEADER_BYTES) return null;
  const header = String.fromCharCode(...bytes.slice(0, 6));
  if (header !== 'GIF87a' && header !== 'GIF89a') return null;
  return { width: bytes[6] | (bytes[7] << 8), height: bytes[8] | (bytes[9] << 8) };
}
