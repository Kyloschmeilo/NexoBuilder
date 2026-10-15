/** PNG header reading. */
import { dataUrlHead } from './dataUrl';

export interface PngInfo {
  width: number;
  height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Signature + IHDR length/type + width + height */
const HEADER_BYTES = 24;

/** Reads width/height from the PNG header. Returns null if it is not a valid PNG. */
function readPngInfo(bytes: Uint8Array): PngInfo | null {
  if (bytes.length < HEADER_BYTES) return null;
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return null;
  }
  const type = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (type !== 'IHDR') return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width === 0 || height === 0) return null;
  return { width, height };
}

export function readPngInfoFromDataUrl(dataUrl: string): PngInfo | null {
  const head = dataUrlHead(dataUrl, HEADER_BYTES);
  return head ? readPngInfo(head) : null;
}

/** Whether the data URL claims to be a PNG (MIME type only – see {@link readPngInfoFromDataUrl} for the content). */
export function isPngDataUrl(dataUrl: string | undefined): dataUrl is string {
  return !!dataUrl && /^data:image\/png[;,]/i.test(dataUrl);
}
