/**
 * What glyphs, sounds and paintings have in common: a user-facing ID inside the project's
 * namespace, an uploaded file and per-entry checks with the same frame and ID rules.
 */
import { formatResourceLocation, readPngInfoFromDataUrl } from '@resourcepackbuilder/minecraft';
import { mediaFrame } from '../issueFrames';
import { issueReporter, type Issue, type ReportIssue } from '@resourcepackbuilder/utils';
import type { Project } from '../types';
import type { MediaKind } from './kinds';

/** An uploaded image (glyph or painting) with the size read from its header. */
export interface MediaFile {
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

/** An uploaded PNG with its size; `null` when `dataUrl` holds no valid PNG. */
export function pngMediaFile(name: string, dataUrl: string): MediaFile | null {
  const info = readPngInfoFromDataUrl(dataUrl);
  return info ? { name, dataUrl, width: info.width, height: info.height } : null;
}

/** Full ID of an entry as Nexo and item configs use it: "<namespace>:<id>". */
export function mediaKey(project: Pick<Project, 'namespace'>, id: string): string {
  return formatResourceLocation(project.namespace, id);
}

export interface EntryRules<T> {
  kind: MediaKind;
  /** The user-facing ID (glyphId, soundId, paintingId) */
  idOf: (entry: T) => string;
  /** Allowed characters of that ID */
  pattern: RegExp;
}

/**
 * Checks a list of entries: every issue targets its entry and carries its `context.<kind>` frame.
 * Invalid (`<kind>.idInvalid`) and duplicate IDs (`<kind>.idDuplicate`) are reported here, the rest by `check`.
 */
export function validateEntries<T extends { id: string }>(
  list: readonly T[],
  rules: EntryRules<T>,
  check: (entry: T, add: ReportIssue) => void,
): Issue[] {
  const issues: Issue[] = [];
  const seen = new Set<string>();
  for (const entry of list) {
    const id = rules.idOf(entry);
    const add = issueReporter(issues, { target: { kind: rules.kind, id: entry.id }, context: [mediaFrame(rules.kind, id)] });
    if (!rules.pattern.test(id)) add('error', `${rules.kind}.idInvalid`);
    if (seen.has(id)) add('error', `${rules.kind}.idDuplicate`);
    seen.add(id);
    check(entry, add);
  }
  return issues;
}
