/**
 * Shared check for the paths a project writes into a test server's plugin folder. Each adapter decides which places
 * are allowed (exactly where its export puts things); this refuses anything a file system treats specially.
 */

/** A path segment: no separators, no "." or "..", nothing a file system treats specially. */
const SAFE_SEGMENT = /^[A-Za-z0-9_.+-]+$/;
/** Windows device names, with or without an extension ("nul", "COM1.yml"); they never name a file there. */
const WINDOWS_DEVICE_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/**
 * Whether `segment` is a single harmless path segment. A trailing "." or space is refused too: Windows drops it, so
 * "internal." would name the folder "internal".
 */
export function isSafeSegment(segment: string): boolean {
  return SAFE_SEGMENT.test(segment) && !/[. ]$/.test(segment) && !WINDOWS_DEVICE_NAME.test(segment);
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
