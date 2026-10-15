/** Allgemeine Hilfsfunktionen ohne DOM-Abhängigkeiten (laufen auch in Tests unter Node). */

export function uid(prefix = ''): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return prefix + random;
}

const UMLAUTS: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', Ä: 'ae', Ö: 'oe', Ü: 'ue' };

/** Entfernt MiniMessage-/Legacy-Formatierungen aus einem Text. */
export function stripFormatting(text: string): string {
  return text
    .replace(/<[^<>]*>/g, '')
    .replace(/[&§][0-9a-fk-orx]/gi, '')
    .trim();
}

/**
 * Wandelt beliebigen Text in einen gültigen Bezeichner um (nur a-z, 0-9 und _).
 * Wird für Item-IDs, Ordner- und Dateinamen verwendet.
 */
export function slugify(text: string, fallback = 'item'): string {
  const slug = stripFormatting(text)
    .replace(/[äöüßÄÖÜ]/g, (c) => UMLAUTS[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
  return slug || fallback;
}

/** Erlaubte Zeichen für Nexo-Item-IDs (werden auch als Pfad im ResourcePack genutzt). */
export const ITEM_ID_PATTERN = /^[a-z0-9_]+$/;
/** Erlaubte Zeichen für einen ResourcePack-Namespace. */
export const NAMESPACE_PATTERN = /^[a-z0-9_.-]+$/;
/** Erlaubte Zeichen für Pfade innerhalb eines Namespaces. */
export const RESOURCE_PATH_PATTERN = /^[a-z0-9_./-]+$/;

export function isValidResourceLocation(value: string): boolean {
  const parts = value.split(':');
  if (parts.length > 2) return false;
  const [ns, path] = parts.length === 2 ? parts : ['minecraft', parts[0]];
  return NAMESPACE_PATTERN.test(ns) && RESOURCE_PATH_PATTERN.test(path) && path.length > 0;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Führt `patch` rekursiv in `base` zusammen (Objekte werden gemischt, alles andere ersetzt).
 * Gibt ein neues Objekt zurück; die Eingaben werden nicht verändert.
 */
export function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const existing = result[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      result[key] = deepMerge(existing, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** Rundet Gleitkommazahlen, um Artefakte wie 5.333333333333333 zu vermeiden. */
export function roundNumber(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function fileBaseName(fileName: string): string {
  const name = fileName.split(/[\\/]/).pop() ?? fileName;
  return name.replace(/\.[^.]+$/, '');
}

export function fileExtension(fileName: string): string {
  const match = /\.([^.\\/]+)$/.exec(fileName);
  return match ? match[1].toLowerCase() : '';
}

/* ---------------------------------------------------------------- Binärdaten */

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || comma < 0) throw new Error('Ungültige Data-URL');
  const header = dataUrl.slice(5, comma);
  const payload = dataUrl.slice(comma + 1);
  if (header.endsWith(';base64')) return base64ToBytes(payload);
  return new TextEncoder().encode(decodeURIComponent(payload));
}

export function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

export interface PngInfo {
  width: number;
  height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Liest Breite/Höhe aus dem PNG-Header. Gibt null zurück, wenn es kein gültiges PNG ist. */
export function readPngInfo(bytes: Uint8Array): PngInfo | null {
  if (bytes.length < 24) return null;
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
  try {
    return readPngInfo(dataUrlToBytes(dataUrl));
  } catch {
    return null;
  }
}

/** Vergleicht Versionsnummern wie "1.21.11" und "26.1". */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const length = Math.max(pa.length, pb.length);
  for (let i = 0; i < length; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

export function maxVersion(...versions: Array<string | undefined>): string | undefined {
  return versions.reduce<string | undefined>((max, v) => {
    if (!v) return max;
    if (!max) return v;
    return compareVersions(v, max) > 0 ? v : max;
  }, undefined);
}
