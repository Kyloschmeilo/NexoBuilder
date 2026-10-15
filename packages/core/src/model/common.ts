/** Shared helpers for the model importers. */
import { CoreError, type MessageParams } from '../errors';

/** A model file could not be imported at all; `code` is a key in the `issues` namespace. */
export class ModelConversionError extends CoreError {
  constructor(code: string, params: MessageParams = {}) {
    super(code, params);
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
