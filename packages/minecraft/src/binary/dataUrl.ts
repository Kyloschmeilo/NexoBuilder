/** Data URLs and base64 (no DOM dependencies; atob/btoa exist in browsers and Node). */
import { CoreError } from '@resourcepackbuilder/utils';

/** A `data:` URL, e.g. "data:image/png;base64,…" */
export type DataUrl = string;

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

interface ParsedDataUrl {
  base64: boolean;
  payload: string;
}

function parseDataUrl(dataUrl: string): ParsedDataUrl | null {
  const comma = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || comma < 0) return null;
  return { base64: dataUrl.slice(5, comma).endsWith(';base64'), payload: dataUrl.slice(comma + 1) };
}

export function isDataUrl(value: string): boolean {
  return parseDataUrl(value) !== null;
}

/** Decodes a data URL. Throws a {@link CoreError} (`file.invalidDataUrl`) if it cannot be decoded. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new CoreError('file.invalidDataUrl');
  try {
    return parsed.base64 ? base64ToBytes(parsed.payload) : new TextEncoder().encode(decodeURIComponent(parsed.payload));
  } catch {
    throw new CoreError('file.invalidDataUrl');
  }
}

/** The first `count` bytes of a base64 data URL (to sniff the file type); null if unreadable. */
export function dataUrlHead(dataUrl: string, count: number): Uint8Array | null {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  try {
    if (!parsed.base64) return dataUrlToBytes(dataUrl).slice(0, count);
    // 4 base64 characters encode 3 bytes
    return base64ToBytes(parsed.payload.slice(0, Math.ceil(count / 3) * 4)).slice(0, count);
  } catch {
    return null;
  }
}
