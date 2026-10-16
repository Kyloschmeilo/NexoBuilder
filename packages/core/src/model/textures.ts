/** Textures of imported models: matching dropped files, animation data and checks. */
import { isPngDataUrl, readPngInfoFromDataUrl } from '../binary/png';
import { z } from 'zod';
import type { Issue } from '../issues';
import { jsonOrNull, parseJson } from '../json';
import { lenientNumber, optional } from '../lenient';
import { isPlainObject } from '../object';
import { McmetaSchema } from './schema';
import { fileBaseName } from '../text';
import type { ImportFile, ModelTexture, TextureAnimation } from './types';

/** Normalizes a file name for comparisons ("Ruby_Sword.PNG" → "ruby_sword"). */
export function normalizeTextureName(name: string): string {
  return fileBaseName(name.replace(/\.png\.mcmeta$/i, '.png')).toLowerCase();
}

/** Searches the dropped files for a PNG with a matching name. */
export function findPngByName(files: ImportFile[], ...candidates: Array<string | undefined>): ImportFile | undefined {
  const wanted = candidates.filter((c): c is string => !!c).map(normalizeTextureName);
  return files.find((file) => isPngDataUrl(file.dataUrl) && wanted.includes(normalizeTextureName(file.name)));
}

/** Finds the .png.mcmeta file for a PNG. */
export function findMcmetaFor(files: ImportFile[], pngName: string): Record<string, unknown> | null {
  const target = normalizeTextureName(pngName);
  const file = files.find((f) => /\.mcmeta$/i.test(f.name) && normalizeTextureName(f.name) === target && f.text);
  return file?.text ? jsonOrNull(parseJson(file.text, McmetaSchema)) : null;
}

/** The animation of a .png.mcmeta; invalid values fall back to Minecraft's defaults. */
const AnimationSchema = z.object({
  frametime: lenientNumber(1),
  interpolate: optional(z.literal(true)),
  frames: optional(z.array(z.union([z.number(), z.object({ index: z.number(), time: z.number() })]))),
  width: optional(z.number()),
  height: optional(z.number()),
});

function readAnimation(texture: ModelTexture) {
  return texture.mcmeta ? (AnimationSchema.safeParse(texture.mcmeta.animation).data ?? null) : null;
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
  const animation = readAnimation(texture);
  return animation && { frametime: animation.frametime, interpolate: animation.interpolate, frames: animation.frames };
}

/** The animation values the user edits; everything else of the .mcmeta animation (frames, size) is kept. */
export interface TextureAnimationSettings {
  frametime: number;
  interpolate: boolean;
}

/** The texture's .mcmeta with `animation` applied, or null (no .mcmeta) when `animation` is null. */
export function withTextureAnimation(
  mcmeta: Record<string, unknown> | null,
  animation: TextureAnimationSettings | null,
): Record<string, unknown> | null {
  if (!animation) return null;
  const current = mcmeta?.animation;
  const next: Record<string, unknown> = { ...(isPlainObject(current) ? current : {}), frametime: animation.frametime };
  if (animation.interpolate) next.interpolate = true;
  else delete next.interpolate;
  return { ...(mcmeta ?? {}), animation: next };
}

/** Size of a single animation frame in pixels (matches the Minecraft logic). */
export function getFrameSize(texture: ModelTexture): { width: number; height: number; count: number } {
  const anim = readAnimation(texture);
  if (!anim) return { width: texture.width, height: texture.height, count: 1 };
  let { width, height } = anim;
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

/** Validates a texture the way Minecraft would when loading it. */
export function validateTexture(texture: ModelTexture): Issue[] {
  const issues: Issue[] = [];
  if (!texture.dataUrl) {
    issues.push({ level: 'error', code: 'texture.missing', args: { name: texture.name } });
    return issues;
  }
  if (texture.mcmeta?.animation) {
    const { width, height } = getFrameSize(texture);
    if (width <= 0 || height <= 0 || texture.width % width !== 0 || texture.height % height !== 0) {
      issues.push({
        level: 'error',
        code: 'texture.animationSizeMismatch',
        args: { name: texture.name, width: texture.width, height: texture.height, frameWidth: width, frameHeight: height },
      });
    }
  } else if (texture.width !== texture.height && texture.height % texture.width === 0 && texture.height > texture.width) {
    issues.push({
      level: 'info',
      code: 'texture.maybeAnimation',
      args: { name: texture.name, width: texture.width, height: texture.height },
    });
  }
  const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;
  if (!isPowerOfTwo(texture.width) || !isPowerOfTwo(texture.height)) {
    issues.push({
      level: 'info',
      code: 'texture.notPowerOfTwo',
      args: { name: texture.name, width: texture.width, height: texture.height },
    });
  }
  return issues;
}
