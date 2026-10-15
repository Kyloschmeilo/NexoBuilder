/**
 * Syncs a project with a shared folder – in both directions.
 *
 * - Local changes are written per entry (item, folder, glyph, project data) as a separate file.
 * - Changes by others are read in and applied during regular polling.
 * - If two people changed the same entry, the newer version wins (logical clock `rev`);
 *   all participants thereby end up with the same state.
 *
 * The sync knows neither Electron nor the browser: file access goes through `SyncFs`,
 * the project through `SyncHost`. This allows testing it with an in-memory file system.
 */
import type { Project } from '../types';
import { stripFormatting } from '../util';
import {
  changedEntityKeys,
  entityKey,
  entityKeys,
  entityPath,
  hashData,
  hashString,
  localEntity,
  makeEnvelope,
  parseEntityKey,
  parseEntityPath,
  parseEnvelope,
  PROJECT_FILE,
  type EntityData,
  type EntityKind,
  type Envelope,
} from './format';
import { applyRemoteEntities, projectFromEnvelopes } from './merge';

export interface SyncFileInfo {
  /** Path relative to the shared folder, separated by "/" */
  path: string;
  mtimeMs: number;
  size: number;
}

export interface SyncFs {
  list(): Promise<SyncFileInfo[]>;
  /** null if the file does not exist (at the moment) */
  read(path: string): Promise<string | null>;
  write(path: string, content: string): Promise<SyncFileInfo>;
}

export interface EntityVersion {
  rev: number;
  by: string;
  byName: string;
  /** Hash of the local state at this version ('deleted' = deleted) */
  hash: string;
}

export interface SyncState {
  clock: number;
  versions: Record<string, EntityVersion>;
  /** Last seen files – so that not everything has to be re-read on startup */
  files: Record<string, { mtimeMs: number; size: number; hash: string }>;
}

export interface SyncIdentity {
  /** Random, fixed ID of this installation */
  clientId: string;
  /** Name shown to the others */
  userName: string;
}

export interface RemoteChange {
  kind: EntityKind;
  id: string;
  byName: string;
  deleted: boolean;
  /** Display name of the entry, e.g. item name */
  label: string;
}

export interface SyncHost {
  getProject(): Project | null;
  /** Apply changes by others – must not count as an own change (undo step) */
  applyRemote(transform: (project: Project) => Project, changes: RemoteChange[]): void;
}

export interface SyncResult {
  applied: RemoteChange[];
  written: number;
}

/** The folder belongs to another project or similar – sync not possible. */
export class ShareFolderError extends Error {}

/** Is version a newer than b? Ties are decided by the installation ID. */
export function isNewer(a: { rev: number; by: string }, b: { rev: number; by: string } | undefined): boolean {
  if (!b) return true;
  return a.rev > b.rev || (a.rev === b.rev && a.by > b.by);
}

export function emptySyncState(): SyncState {
  return { clock: 0, versions: {}, files: {} };
}

function labelOf(kind: EntityKind, data: EntityData | undefined): string {
  if (!data) return '';
  const d = data as unknown as Record<string, unknown>;
  switch (kind) {
    case 'project':
      return 'Projekt-Einstellungen';
    case 'folder':
      return String(d.name ?? '');
    case 'item':
      return stripFormatting(String(d.displayName ?? '')) || String(d.nexoId ?? '');
    case 'glyph':
      return String(d.glyphId ?? '');
    case 'sound':
      return String(d.soundId ?? '');
    case 'painting':
      return String(d.paintingId ?? '');
  }
}

export class SyncEngine {
  readonly projectId: string;
  private versions: Map<string, EntityVersion>;
  private files: Map<string, { mtimeMs: number; size: number; hash: string }>;
  private clock: number;
  private snapshot: Project;
  /** Locally changed entries that must be written with a new version */
  private dirty = new Set<string>();
  /** Entries whose file contains an older version than ours – write ours again */
  private rewrite = new Set<string>();
  private queue: Promise<unknown> = Promise.resolve();
  private applying = false;
  private stopped = false;

  constructor(
    private readonly fs: SyncFs,
    private readonly host: SyncHost,
    private identity: SyncIdentity,
    state: SyncState | null,
    private readonly now: () => number = Date.now,
  ) {
    const project = host.getProject();
    if (!project) throw new Error('Kein Projekt geöffnet');
    this.snapshot = project;
    this.projectId = project.id;
    this.versions = new Map(Object.entries(state?.versions ?? {}));
    this.files = new Map(Object.entries(state?.files ?? {}));
    this.clock = state?.clock ?? 0;
    // Everything that changed locally since the last sync (including deletions) must be written
    const keys = new Set([...entityKeys(project), ...this.versions.keys()]);
    for (const key of keys) {
      if (this.versions.get(key)?.hash !== hashData(localEntity(project, key))) this.dirty.add(key);
    }
  }

  get state(): SyncState {
    return { clock: this.clock, versions: Object.fromEntries(this.versions), files: Object.fromEntries(this.files) };
  }

  /** Number of local changes not yet in the folder */
  get pending(): number {
    return this.dirty.size + this.rewrite.size;
  }

  setUserName(userName: string) {
    this.identity = { ...this.identity, userName };
  }

  stop() {
    this.stopped = true;
  }

  /** Report a local change (from the store subscription). Returns true if there is something to write. */
  noteLocalChange(project: Project): boolean {
    if (this.applying || this.stopped || project.id !== this.projectId || project === this.snapshot) return false;
    for (const key of changedEntityKeys(this.snapshot, project)) this.dirty.add(key);
    this.snapshot = project;
    return this.dirty.size > 0;
  }

  /** Write pending local changes. */
  flush(): Promise<number> {
    return this.serial(() => this.flushNow());
  }

  /** Read in changes by others and then write pending changes. */
  sync(): Promise<SyncResult> {
    return this.serial(async () => {
      const applied = await this.pollNow();
      const written = await this.flushNow();
      return { applied, written };
    });
  }

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private tick(): number {
    this.clock = Math.max(this.now(), this.clock + 1);
    return this.clock;
  }

  private async flushNow(): Promise<number> {
    // Project file first – it marks the folder as a ResourcepackBuilder project
    const keys = [...new Set([...this.dirty, ...this.rewrite])].sort((a, b) => Number(b === 'project') - Number(a === 'project'));
    let written = 0;
    for (const key of keys) {
      if (this.stopped) break;
      const isDirty = this.dirty.has(key);
      const isRewrite = this.rewrite.has(key);
      this.dirty.delete(key);
      this.rewrite.delete(key);
      const ref = parseEntityKey(key);
      if (ref.kind === 'project') ref.id = this.projectId;
      const data = localEntity(this.snapshot, key);
      const hash = hashData(data);
      let version = this.versions.get(key);
      if (isDirty && version?.hash !== hash) {
        if (!version && data === undefined) continue; // never shared, already deleted again
        version = { rev: this.tick(), by: this.identity.clientId, byName: this.identity.userName, hash };
      } else if (!isRewrite || !version) {
        continue; // nothing changed
      }
      const content = JSON.stringify(makeEnvelope(ref, version, data));
      try {
        const info = await this.fs.write(entityPath(ref.kind, ref.id), content);
        this.files.set(info.path, { mtimeMs: info.mtimeMs, size: info.size, hash: hashString(content) });
        this.versions.set(key, version);
        written++;
      } catch (err) {
        (isDirty ? this.dirty : this.rewrite).add(key);
        throw err;
      }
    }
    return written;
  }

  private async pollNow(): Promise<RemoteChange[]> {
    const accepted: Envelope[] = [];
    for (const info of await this.fs.list()) {
      if (this.stopped) return [];
      const ref = parseEntityPath(info.path);
      if (!ref) continue;
      const known = this.files.get(info.path);
      if (known && known.mtimeMs === info.mtimeMs && known.size === info.size) continue;
      const text = await this.fs.read(info.path);
      if (text === null) continue;
      const hash = hashString(text);
      if (known?.hash === hash) {
        this.files.set(info.path, { mtimeMs: info.mtimeMs, size: info.size, hash });
        continue;
      }
      const env = parseEnvelope(text, ref);
      // Incomplete (e.g. currently being downloaded by the cloud service) – try again next time
      if (!env) continue;
      if (env.kind === 'project' && env.id !== this.projectId) {
        throw new ShareFolderError('In diesem Ordner liegt ein anderes geteiltes Projekt.');
      }
      this.files.set(info.path, { mtimeMs: info.mtimeMs, size: info.size, hash });
      this.clock = Math.max(this.clock, env.rev);
      const key = entityKey(env.kind, env.id);
      const local = this.versions.get(key);
      if (isNewer(env, local)) {
        // An own, not yet written change is newer and will be written shortly
        if (!this.dirty.has(key)) accepted.push(env);
      } else if (local && (env.rev !== local.rev || env.by !== local.by)) {
        this.rewrite.add(key);
      }
    }
    if (accepted.length === 0) return [];

    const before = this.host.getProject();
    if (!before || before.id !== this.projectId || this.stopped) return [];
    const changes: RemoteChange[] = accepted.map((env) => {
      const key = entityKey(env.kind, env.id);
      return {
        kind: env.kind,
        id: env.id,
        byName: env.byName,
        deleted: !!env.deleted,
        label: labelOf(env.kind, env.data ?? localEntity(before, key)),
      };
    });
    this.applying = true;
    try {
      this.host.applyRemote((project) => applyRemoteEntities(project, accepted), changes);
    } finally {
      this.applying = false;
    }
    const after = this.host.getProject();
    if (!after) return [];
    const acceptedKeys = new Set<string>();
    for (const env of accepted) {
      const key = entityKey(env.kind, env.id);
      acceptedKeys.add(key);
      this.versions.set(key, { rev: env.rev, by: env.by, byName: env.byName, hash: hashData(localEntity(after, key)) });
    }
    // Entries that were only adjusted by cleaning up the folder structure still count as synced
    for (const key of changedEntityKeys(before, after)) {
      const version = this.versions.get(key);
      if (acceptedKeys.has(key) || this.dirty.has(key)) continue;
      if (version) this.versions.set(key, { ...version, hash: hashData(localEntity(after, key)) });
      else this.dirty.add(key);
    }
    this.snapshot = after;
    return changes;
  }
}

/** Reads a shared folder completely (to open a shared project). */
export async function readShareFolder(fs: SyncFs): Promise<{ project: Project; state: SyncState } | null> {
  const files: SyncState['files'] = {};
  const envelopes: Envelope[] = [];
  let meta: Envelope | null = null;
  let clock = 0;
  for (const info of await fs.list()) {
    const ref = parseEntityPath(info.path);
    if (!ref) continue;
    const text = await fs.read(info.path);
    if (text === null) continue;
    const env = parseEnvelope(text, ref);
    if (!env) continue;
    files[info.path] = { mtimeMs: info.mtimeMs, size: info.size, hash: hashString(text) };
    clock = Math.max(clock, env.rev);
    if (info.path === PROJECT_FILE) meta = env.deleted ? null : env;
    else envelopes.push(env);
  }
  if (!meta) return null;
  const project = projectFromEnvelopes(meta, envelopes);
  const versions: SyncState['versions'] = {};
  for (const env of [meta, ...envelopes]) {
    const key = entityKey(env.kind, env.id);
    versions[key] = { rev: env.rev, by: env.by, byName: env.byName, hash: hashData(localEntity(project, key)) };
  }
  // Entries that only exist due to the cleanup (e.g. "Wiederhergestellt") are written on startup
  return { project, state: { clock, versions, files } };
}
