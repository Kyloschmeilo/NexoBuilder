/**
 * Which files the project may write into the test server's plugins/Nexo folder: exactly the places the export puts
 * things (see `nexoFolderFiles` in files.ts). Anything else – settings.yml, other plugins' data, paths with ".." – is refused.
 */
import { PAINTINGS_FILE, SOUNDS_FILE } from '@resourcepackbuilder/export';

/** Folders under plugins/Nexo the export writes into. */
const SYNC_DIRS = ['items/', 'recipes/', 'glyphs/', 'pack/external_packs/'];
/** Single files directly in plugins/Nexo (there is only one of each). */
const SYNC_FILES = [SOUNDS_FILE, PAINTINGS_FILE];
/** A path segment: no separators, no "." or "..", nothing a file system treats specially. */
const SAFE_SEGMENT = /^[A-Za-z0-9_.+-]+$/;

/**
 * The segments of a project file path relative to plugins/Nexo, or null if the project may not write it.
 */
export function syncPathSegments(relativePath: string): string[] | null {
  const allowed =
    SYNC_FILES.includes(relativePath) || SYNC_DIRS.some((dir) => relativePath.startsWith(dir) && relativePath.length > dir.length);
  if (!allowed) return null;
  const segments = relativePath.split('/');
  if (segments.some((segment) => !SAFE_SEGMENT.test(segment) || segment === '.' || segment === '..')) return null;
  return segments;
}
