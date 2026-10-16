/**
 * Shared check for the paths a project writes into a test server's plugin folder. Each adapter decides which places
 * are allowed (exactly where its export puts things); this refuses anything a file system treats specially.
 */

/** A path segment: no separators, no "." or "..", nothing a file system treats specially. */
const SAFE_SEGMENT = /^[A-Za-z0-9_.+-]+$/;

/** Whether `segment` is a single harmless path segment. */
export function isSafeSegment(segment: string): boolean {
  return SAFE_SEGMENT.test(segment) && segment !== '.' && segment !== '..';
}

/** The segments of `relativePath`, or null if one of them is empty or not safe. */
export function safePathSegments(relativePath: string): string[] | null {
  const segments = relativePath.split('/');
  return segments.every(isSafeSegment) ? segments : null;
}

/** Whether `relativePath` is one of `files` or lies (with a file name) under one of `dirs` (each ending in "/"). */
export function isUnderSyncPaths(relativePath: string, dirs: readonly string[], files: readonly string[]): boolean {
  return files.includes(relativePath) || dirs.some((dir) => relativePath.startsWith(dir) && relativePath.length > dir.length);
}
