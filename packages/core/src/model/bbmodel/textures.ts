/** Textures of a Blockbench project: matching the PNG data, texture keys and animation data. */
import { isPngDataUrl, readPngInfoFromDataUrl } from '../../binary/png';
import type { Issue } from '../../issues';
import { fileBaseName } from '../../text';
import { roundNumber } from '../geometry';
import { findPngByName } from '../textures';
import type { ImportFile } from '../types';
import { positiveNumber, type BBFace, type BBTexture, type UvSize } from './types';

export interface TextureEntry {
  tex: BBTexture;
  index: number;
  /** Name used for the file in the pack */
  displayName: string;
  /** Key in the model's "textures" object (Blockbench: texture.id) */
  key: string;
  dataUrl: string | undefined;
}

/** Finds the PNG of every texture (embedded or among the dropped files) and assigns unique keys. */
export function readTextureEntries(textures: BBTexture[], extraFiles: ImportFile[], issues: Issue[]): TextureEntry[] {
  const keys = textureKeys(textures);
  return textures.map((tex, index) => {
    const displayName = tex.name || fileBaseName(tex.path ?? tex.relative_path ?? '') || `texture_${index}`;
    let dataUrl = isPngDataUrl(tex.source) ? tex.source : undefined;
    if (!dataUrl && tex.source?.startsWith('data:')) {
      issues.push({ level: 'error', code: 'model.textureNotPng', args: { name: displayName } });
    }
    if (!dataUrl) {
      const match = findPngByName(
        extraFiles,
        tex.name,
        tex.path && fileBaseName(tex.path),
        tex.relative_path && fileBaseName(tex.relative_path),
      );
      dataUrl = match?.dataUrl;
    }
    return { tex, index, displayName, key: keys[index], dataUrl };
  });
}

/** Texture keys like Blockbench: the texture ID (or index); duplicates get the index appended. */
function textureKeys(textures: BBTexture[]): string[] {
  const seen = new Set<string>();
  return textures.map((tex, index) => {
    const raw = tex.id !== undefined && tex.id !== null && String(tex.id).trim() !== '' ? String(tex.id) : String(index);
    const key = raw.replace(/^#/, '');
    if (seen.has(key)) return `${key}_${index}`;
    seen.add(key);
    return key;
  });
}

/** The texture a face refers to: null = face disabled, undefined = no (known) texture. */
export function faceTexture(entries: TextureEntry[], ref: BBFace['texture']): TextureEntry | null | undefined {
  if (ref === null) return null;
  if (typeof ref === 'number') return entries[ref];
  if (typeof ref === 'string') {
    return entries.find((e) => e.tex.uuid === ref || `#${e.tex.id}` === ref || String(e.tex.id) === ref);
  }
  return undefined;
}

/**
 * Animation data like Blockbench (Texture.getMCMetaContent): a texture counts as animated
 * if its aspect ratio does not match the UV grid.
 */
export function buildTextureMcmeta(entry: TextureEntry, uv: UvSize): Record<string, unknown> | null {
  const image = entry.dataUrl ? readPngInfoFromDataUrl(entry.dataUrl) : null;
  if (!image) return null;
  const ratio = image.width / image.height;
  if (Math.abs(ratio - uv.width / uv.height) < 1e-9) return null;
  const frameCount = Math.ceil(uv.width / uv.height / ratio - 0.05);
  if (frameCount <= 1) return null;

  const animation: Record<string, unknown> = {
    frametime: positiveNumber(entry.tex.frame_time, 1),
  };
  const frameHeight = image.height / frameCount;
  if (image.width !== frameHeight) {
    animation.width = image.width;
    animation.height = Number.isInteger(frameHeight) ? frameHeight : roundNumber(frameHeight, 3);
  }
  if (entry.tex.frame_interpolate) animation.interpolate = true;
  const frames = frameIndices(entry.tex, frameCount);
  if (frames) animation.frames = frames;
  return { animation };
}

function frameIndices(tex: BBTexture, count: number): Array<number | { index: number; time: number }> | undefined {
  if (tex.frame_order_type === 'backwards') {
    return Array.from({ length: count }, (_, i) => count - 1 - i);
  }
  if (tex.frame_order_type === 'back_and_forth') {
    return Array.from({ length: count * 2 - 2 }, (_, i) => (i >= count - 1 ? count * 2 - 2 - i : i));
  }
  if (tex.frame_order_type === 'custom' && typeof tex.frame_order === 'string' && tex.frame_order.trim()) {
    return tex.frame_order
      .trim()
      .split(/\s+/)
      .map((part) => {
        if (part.includes(':')) {
          const [index, time] = part.split(':').map((v) => parseInt(v, 10));
          return { index, time };
        }
        return parseInt(part, 10);
      })
      .filter((v) => (typeof v === 'number' ? Number.isFinite(v) : Number.isFinite(v.index) && Number.isFinite(v.time)));
  }
  return undefined;
}
