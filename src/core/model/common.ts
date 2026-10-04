/** Gemeinsame Hilfen für die Modell-Importer. */

export class ModelConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelConversionError';
  }
}

const PLACEHOLDER_PREFIX = '$tex:';

/** Platzhalter für eine importierte Textur im Modell-JSON (wird beim Export ersetzt). */
export function texturePlaceholder(textureId: string): string {
  return PLACEHOLDER_PREFIX + textureId;
}

/** Gibt die Textur-ID zurück, wenn `value` ein Platzhalter ist. */
export function parseTexturePlaceholder(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith(PLACEHOLDER_PREFIX) ? value.slice(PLACEHOLDER_PREFIX.length) : null;
}
