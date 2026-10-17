/**
 * Packs a plugin ships inside its JAR. CraftEngine copies its built-in packs (default_templates, internal …) from the
 * JAR's `resources/` into plugins/CraftEngine/resources only on a start that finds no such folder. The test server
 * writes the project's pack there before the plugin's first start, so the app copies the missing ones itself.
 */
import JSZip from 'jszip';
import { safePathSegments } from './syncPaths';

/** CraftEngine's listing of a JAR folder's contents; it is read while copying, never copied itself. */
const INDEX_FILE = '_index.json';

export interface BundledFile {
  /** Path relative to the bundled folder: `<pack>/…` */
  path: string;
  data: Uint8Array;
}

/**
 * The files of the packs in `folder/` of `jar` whose pack folder is not among `existing` (the subfolders already on
 * the server). Files lying directly in `folder/`, the `_index.json` listings and unsafe paths are left out; an
 * unreadable JAR yields nothing.
 */
export async function missingBundledFiles(jar: Uint8Array, folder: string, existing: ReadonlySet<string>): Promise<BundledFile[]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(jar);
  } catch {
    return [];
  }
  const prefix = `${folder}/`;
  const files: BundledFile[] = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || !entry.name.startsWith(prefix)) continue;
    const path = entry.name.slice(prefix.length);
    const segments = safePathSegments(path);
    if (!segments || segments.length < 2 || existing.has(segments[0]) || segments.at(-1) === INDEX_FILE) continue;
    files.push({ path, data: await entry.async('uint8array') });
  }
  return files;
}
