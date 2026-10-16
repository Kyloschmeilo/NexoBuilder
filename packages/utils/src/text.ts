/** Text helpers without DOM dependencies. */

const UMLAUTS: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', Ä: 'ae', Ö: 'oe', Ü: 'ue' };

/** Removes MiniMessage tags and legacy formatting codes (&a, §c) from a text. */
export function stripFormatting(text: string): string {
  return text
    .replace(/<[^<>]*>/g, '')
    .replace(/[&§][0-9a-fk-orx]/gi, '')
    .trim();
}

/** Lowercase ASCII version of a text: formatting removed, umlauts transliterated, accents dropped. */
function toAscii(text: string): string {
  return stripFormatting(text)
    .replace(/[äöüßÄÖÜ]/g, (c) => UMLAUTS[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Turns `text` into an identifier: every run of characters outside `allowed` (a regex character
 * class body such as `a-z0-9`) becomes `_`, underscores are collapsed and trimmed.
 */
export function toIdentifier(text: string, allowed: string, fallback: string): string {
  const slug = toAscii(text)
    .replace(new RegExp(`[^${allowed}]+`, 'g'), '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || fallback;
}

/**
 * Converts arbitrary text into a valid identifier (only a-z, 0-9 and _).
 * Used for item IDs, folder and file names.
 */
export function slugify(text: string, fallback = 'item'): string {
  return toIdentifier(text, 'a-z0-9', fallback);
}

/** Turns "ruby_sword.bbmodel" into a readable name ("Ruby Sword"). */
export function prettyNameFromFile(fileName: string): string {
  const base = fileBaseName(fileName).replace(/[_-]+/g, ' ').trim();
  return base.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/** "textures/Ruby Sword.png" → "Ruby Sword" */
export function fileBaseName(fileName: string): string {
  const name = fileName.split(/[\\/]/).pop() ?? fileName;
  return name.replace(/\.[^.]+$/, '');
}
