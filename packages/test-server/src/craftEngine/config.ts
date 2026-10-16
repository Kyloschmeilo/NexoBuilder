/** CraftEngine's config.yml as the test server needs it: the resource pack served locally (localhost). */
import { Document, isMap, parseDocument } from 'yaml';

export interface CraftEngineServerConfig {
  /** Port over which CraftEngine serves the resource pack */
  packPort: number;
}

/** Values that ResourcepackBuilder sets in plugins/CraftEngine/config.yml */
function configOverrides(options: CraftEngineServerConfig): Array<[string[], unknown]> {
  return [
    // Serve the pack from this machine; "auto" would pick the public address
    [['resource-pack', 'self-host', 'ip'], '127.0.0.1'],
    [['resource-pack', 'self-host', 'port'], options.packPort],
    // One-time download links break when the client asks for the pack again
    [['resource-pack', 'self-host', 'one_time_token'], false],
    [['resource-pack', 'delivery', 'send-on-join'], true],
    // A declined pack should not lock the tester out of their own server
    [['resource-pack', 'delivery', 'kick-if-declined'], false],
  ];
}

/**
 * Sets the required values in config.yml. Everything else (including comments) is preserved. If the file does not
 * exist yet, a small file is created – CraftEngine adds the rest on startup. If all values are already correct, the
 * file is returned unchanged, so an unchanged config never counts as a change.
 */
export function patchCraftEngineConfig(current: string | null, options: CraftEngineServerConfig): string {
  const doc = current?.trim() ? parseDocument(current) : new Document({});
  if (doc.errors.length > 0 || (doc.contents !== null && typeof doc.toJS() !== 'object')) {
    // Don't make a broken file worse: only write our values fresh
    return patchCraftEngineConfig(null, options);
  }
  if (!current?.trim()) doc.commentBefore = ' Created by ResourcepackBuilder – CraftEngine adds the remaining settings on startup.';
  let changed = !current?.trim();
  for (const [path, value] of configOverrides(options)) {
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

/** CraftEngine writes some values as text ("8082", "false") – the same content counts as equal. */
function sameSetting(actual: unknown, wanted: unknown): boolean {
  if (actual === wanted) return true;
  if (typeof wanted === 'number') return typeof actual !== 'boolean' && actual !== null && Number(actual) === wanted;
  if (typeof wanted === 'boolean') return String(actual).toLowerCase() === String(wanted);
  return false;
}
