/**
 * Patching of a plugin's YAML settings file (Nexo's settings.yml, CraftEngine's config.yml): the values the test server
 * needs are set, everything else (including comments) is preserved.
 */
import { Document, isMap, parseDocument } from 'yaml';

/** A value the test server sets, by its path of keys. */
export type YamlSetting = [path: string[], value: unknown];

export interface PatchYamlSettingsOptions {
  /** The comment on top of a file that ResourcepackBuilder creates. */
  header: string;
  /** The YAML version the plugin reads (Nexo reads YAML 1.1). */
  version?: '1.1' | '1.2';
}

/**
 * Sets `overrides` in the file. If the file does not exist yet, a small file is created, and the plugin adds the rest
 * on startup. If all values are already correct, the file is returned unchanged: the plugins reformat their files
 * themselves, and that must not count as a change (otherwise the plugin would be reloaded constantly).
 */
export function patchYamlSettings(current: string | null, overrides: YamlSetting[], options: PatchYamlSettingsOptions): string {
  const yamlOptions = { version: options.version ?? '1.2' };
  const doc = current?.trim() ? parseDocument(current, yamlOptions) : new Document({}, yamlOptions);
  if (doc.errors.length > 0 || (doc.contents !== null && typeof doc.toJS() !== 'object')) {
    // Don't make a broken file worse: only write our values fresh
    return patchYamlSettings(null, overrides, options);
  }
  if (!current?.trim()) doc.commentBefore = options.header;
  let changed = !current?.trim();
  for (const [path, value] of overrides) {
    if (sameSetting(doc.getIn(path), value)) continue;
    changed = true;
    // Create missing or wrong intermediate levels as normal sections
    for (let i = 1; i < path.length; i++) {
      const prefix = path.slice(0, i);
      if (!isMap(doc.getIn(prefix, true))) doc.setIn(prefix, doc.createNode({}));
    }
    doc.setIn(path, value);
  }
  if (!changed && current !== null) return current;
  return doc.toString({ lineWidth: 0 });
}

/**
 * The plugins write some values differently (a number or boolean as text, an enum in lowercase); the same content
 * counts as equal. One comparison serves both plugins: Nexo reads its enums case-insensitively, and CraftEngine's
 * only string values (a locale, which Java normalizes, and an IP address) have no case that matters.
 */
function sameSetting(actual: unknown, wanted: unknown): boolean {
  if (actual === wanted) return true;
  // Number(null) is 0 and Number(true) is 1, so those never count as a number
  if (typeof wanted === 'number') return typeof actual !== 'boolean' && actual !== null && Number(actual) === wanted;
  if (typeof wanted === 'string' && typeof actual === 'string') return actual.trim().toUpperCase() === wanted.toUpperCase();
  if (typeof wanted === 'boolean') return String(actual).toLowerCase() === String(wanted);
  return false;
}
