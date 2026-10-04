import type { Issue, ModelTexture, TextureAnimation } from '../types';
import { fileBaseName, readPngInfoFromDataUrl } from '../util';

/** Eine zusätzlich vom Nutzer abgelegte Datei (PNG oder .mcmeta). */
export interface DroppedFile {
  name: string;
  /** Für PNGs: Data-URL. */
  dataUrl?: string;
  /** Für Text-Dateien (.json, .mcmeta, .bbmodel): Inhalt. */
  text?: string;
}

export function isPngDataUrl(dataUrl: string | undefined): dataUrl is string {
  return !!dataUrl && /^data:image\/png[;,]/i.test(dataUrl);
}

/** Normalisiert einen Dateinamen für Vergleiche ("Ruby_Sword.PNG" → "ruby_sword"). */
export function normalizeTextureName(name: string): string {
  return fileBaseName(name.replace(/\.png\.mcmeta$/i, '.png')).toLowerCase();
}

/** Sucht in den abgelegten Dateien eine PNG mit passendem Namen. */
export function findPngByName(files: DroppedFile[], ...candidates: Array<string | undefined>): DroppedFile | undefined {
  const wanted = candidates.filter((c): c is string => !!c).map(normalizeTextureName);
  return files.find((file) => isPngDataUrl(file.dataUrl) && wanted.includes(normalizeTextureName(file.name)));
}

/** Sucht die .png.mcmeta-Datei zu einer PNG. */
export function findMcmetaFor(files: DroppedFile[], pngName: string): Record<string, unknown> | null {
  const target = normalizeTextureName(pngName);
  const file = files.find((f) => /\.mcmeta$/i.test(f.name) && normalizeTextureName(f.name) === target && f.text);
  if (!file?.text) return null;
  try {
    const parsed = JSON.parse(file.text) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function createTexture(id: string, name: string, dataUrl: string, mcmeta: Record<string, unknown> | null = null): ModelTexture {
  const info = dataUrl ? readPngInfoFromDataUrl(dataUrl) : null;
  return {
    id,
    name: fileBaseName(name) || id,
    dataUrl: info ? dataUrl : '',
    width: info?.width ?? 0,
    height: info?.height ?? 0,
    mcmeta,
  };
}

export function getAnimation(texture: ModelTexture): TextureAnimation | null {
  const animation = texture.mcmeta?.animation;
  if (!animation || typeof animation !== 'object' || Array.isArray(animation)) return null;
  const a = animation as Record<string, unknown>;
  return {
    frametime: typeof a.frametime === 'number' ? a.frametime : 1,
    interpolate: a.interpolate === true ? true : undefined,
    frames: Array.isArray(a.frames) ? (a.frames as TextureAnimation['frames']) : undefined,
  };
}

/** Größe eines einzelnen Animations-Frames in Pixeln (entspricht der Minecraft-Logik). */
export function getFrameSize(texture: ModelTexture): { width: number; height: number; count: number } {
  const anim = texture.mcmeta?.animation as Record<string, unknown> | undefined;
  if (!anim || typeof anim !== 'object') {
    return { width: texture.width, height: texture.height, count: 1 };
  }
  let width = typeof anim.width === 'number' ? anim.width : undefined;
  let height = typeof anim.height === 'number' ? anim.height : undefined;
  if (width === undefined && height === undefined) {
    const size = Math.min(texture.width, texture.height);
    width = size;
    height = size;
  } else {
    width = width ?? texture.width;
    height = height ?? texture.height;
  }
  const count = width > 0 && height > 0 ? Math.floor(texture.width / width) * Math.floor(texture.height / height) : 1;
  return { width, height, count: Math.max(1, count) };
}

/** Prüft eine Textur so, wie Minecraft sie beim Laden prüfen würde. */
export function validateTexture(texture: ModelTexture, label: string): Issue[] {
  const issues: Issue[] = [];
  if (!texture.dataUrl) {
    issues.push({ level: 'error', message: `${label}: Die Textur „${texture.name}“ fehlt. Bitte eine PNG-Datei zuweisen.` });
    return issues;
  }
  if (texture.mcmeta?.animation) {
    const { width, height } = getFrameSize(texture);
    if (width <= 0 || height <= 0 || texture.width % width !== 0 || texture.height % height !== 0) {
      issues.push({
        level: 'error',
        message: `${label}: Die Animation der Textur „${texture.name}“ passt nicht zur Bildgröße (${texture.width}×${texture.height}, Frame ${width}×${height}).`,
      });
    }
  } else if (texture.width !== texture.height && texture.height % texture.width === 0 && texture.height > texture.width) {
    issues.push({
      level: 'info',
      message: `${label}: „${texture.name}“ ist ${texture.width}×${texture.height} groß. Falls das eine Animation ist, bitte im Modell-Tab die Animation aktivieren.`,
    });
  }
  const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;
  if (!isPowerOfTwo(texture.width) || !isPowerOfTwo(texture.height)) {
    issues.push({
      level: 'info',
      message: `${label}: „${texture.name}“ (${texture.width}×${texture.height}) hat keine Zweierpotenz als Größe. Das funktioniert, kann aber die Mipmaps im Spiel verschlechtern.`,
    });
  }
  return issues;
}
