/** Following texture references ("#key") inside a model to the texture they end at. */
import { parseTexturePlaceholder } from '../tokens';
import type { ImportedModel, ModelTexture } from './types';

type FollowResult = { value: string } | { value: null; stuckAt: string };

function follow(textures: Record<string, string> | undefined, ref: string): FollowResult {
  let value: string | undefined = ref;
  const seen = new Set<string>();
  while (value?.startsWith('#')) {
    const key = value.slice(1);
    // A cycle is reported at the reference that closes it
    if (seen.has(key)) return { value: null, stuckAt: value };
    seen.add(key);
    value = textures?.[key];
  }
  return value ? { value } : { value: null, stuckAt: ref };
}

/**
 * Follows "#key" references through `textures` and returns the value they end at (a resource
 * location or texture placeholder); null if a key is undefined or the references form a cycle.
 * A value without "#" is returned as is.
 */
export function followTextureRef(textures: Record<string, string> | undefined, ref: string): string | null {
  return follow(textures, ref).value;
}

export interface TextureResolution {
  /** The imported texture the reference ends at (with image data) */
  texture: ModelTexture | null;
  /** Otherwise what could not be resolved (vanilla texture, undefined "#key" …) */
  unresolved: string | null;
}

/** Resolves a face's texture reference down to the imported texture of the model. */
export function resolveTextureRef(model: ImportedModel, ref: string): TextureResolution {
  const result = follow(model.json.textures, ref);
  if (result.value === null) return { texture: null, unresolved: result.stuckAt };
  const id = parseTexturePlaceholder(result.value);
  const texture = id ? (model.textures.find((t) => t.id === id) ?? null) : null;
  return texture?.dataUrl ? { texture, unresolved: null } : { texture: null, unresolved: result.value };
}
