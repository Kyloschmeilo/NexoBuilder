/** Collects the files of a resource pack and reports what cannot be written. */
import { dataUrlToBytes, isDataUrl, type ModelTexture } from '@resourcepackbuilder/minecraft';
import type { Issue, IssueLevel } from '@resourcepackbuilder/utils';
import { isSafeRelativePath } from './paths';
import type { FileContent } from './types';

/** How an unreadable file is reported. */
export interface FileSource {
  /** Puts the issue into its context (e.g. the item); default: the writer's own issue list */
  report?: (issue: Issue) => void;
  /** Default: error */
  level?: IssueLevel;
}

function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}

export class PackWriter {
  readonly files = new Map<string, FileContent>();
  readonly issues: Issue[] = [];
  /** Paths written more than once (a safety net against overwriting) */
  private readonly duplicates = new Set<string>();

  /** @param includeBinaries decode binary files; without, they are only checked and written empty */
  constructor(private readonly includeBinaries: boolean) {}

  text(path: string, content: string): void {
    if (!this.isSafe(path)) return;
    if (this.files.has(path)) this.duplicates.add(path);
    this.files.set(path, content);
  }

  json(path: string, value: unknown): void {
    this.text(path, jsonText(value));
  }

  /** Writes a data URL as a binary file; an unreadable one is reported and skipped. */
  binary(path: string, dataUrl: string, source: FileSource = {}): boolean {
    if (!this.isSafe(path, source)) return false;
    let bytes: Uint8Array | null;
    if (this.includeBinaries) {
      try {
        bytes = dataUrlToBytes(dataUrl);
      } catch {
        bytes = null;
      }
    } else {
      bytes = isDataUrl(dataUrl) ? new Uint8Array(0) : null;
    }
    if (!bytes) {
      const issue: Issue = { level: source.level ?? 'error', code: 'plan.fileUnreadable', args: { path } };
      if (source.report) source.report(issue);
      else this.issues.push(issue);
      return false;
    }
    if (this.files.has(path)) this.duplicates.add(path);
    this.files.set(path, bytes);
    return true;
  }

  /** Writes a texture PNG and, if it has one, its .png.mcmeta. */
  texture(path: string, texture: ModelTexture, source: FileSource = {}): void {
    if (!this.binary(path, texture.dataUrl, source)) return;
    if (texture.mcmeta && Object.keys(texture.mcmeta).length > 0) this.json(`${path}.mcmeta`, texture.mcmeta);
  }

  /** Whether the path may be written; an unsafe one (see isSafeRelativePath) is reported and skipped. */
  private isSafe(path: string, source: FileSource = {}): boolean {
    if (isSafeRelativePath(path)) return true;
    const issue: Issue = { level: 'error', code: 'plan.unsafePath', args: { path } };
    if (source.report) source.report(issue);
    else this.issues.push(issue);
    return false;
  }

  /** Issues for the paths written more than once. */
  duplicateIssues(): Issue[] {
    return [...this.duplicates].map((path) => ({ level: 'error', code: 'plan.duplicateFile', args: { path } }));
  }
}
