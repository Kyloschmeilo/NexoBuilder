/** Shared helpers for the model importers. */

export class ModelConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelConversionError';
  }
}

const PLACEHOLDER_PREFIX = '$tex:';

/** Placeholder for an imported texture in the model JSON (replaced on export). */
export function texturePlaceholder(textureId: string): string {
  return PLACEHOLDER_PREFIX + textureId;
}

/** Returns the texture ID if `value` is a placeholder. */
export function parseTexturePlaceholder(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith(PLACEHOLDER_PREFIX) ? value.slice(PLACEHOLDER_PREFIX.length) : null;
}
