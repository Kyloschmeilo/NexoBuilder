/** Characters of glyph and painting IDs (as a regex character class body). */
export const ID_CHARS = 'a-z0-9_';
/** Characters of sound IDs, which may contain dots and dashes (`block.ruby.place`). */
export const SOUND_ID_CHARS = 'a-z0-9_.-';

/**
 * Normalises an ID while it is typed: lower case, other characters become `_`. Unlike core `toIdentifier` it keeps
 * leading/trailing underscores, so the text does not change under the cursor.
 */
export function typedId(text: string, allowed: string): string {
  return text.toLowerCase().replace(new RegExp(`[^${allowed}]`, 'g'), '_');
}
