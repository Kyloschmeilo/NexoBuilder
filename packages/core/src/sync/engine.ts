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
import { CoreError } from '../issues';
import { mediaId, mediaList, type MediaEntry, type MediaKind } from '../nexo/media/kinds';
import { itemLabel } from '../project/labels';
import type { Project } from '../project/types';
import {
  changedEntityKeys,
  entityKey,
  entityKeys,
  entityPath,
  hashData,
  hashString,
  localEntity,
  createEnvelope,
  parseEntityKey,
  parseEntityPath,
  parseEnvelope,
  type EntityKind,
  type EntityRef,
  type Envelope,
  type ProjectMeta,
} from './format';
import { applyRemoteEntities, projectFromEnvelopes } from './merge';

/** A file inside a shared folder (the same shape as the desktop API's `ShareFileInfo`; core stays independent of it). */
export interface ShareFileInfo {
  /** Path relative to the shared folder, separated by "/" */
  path: string;
  mtimeMs: number;
  size: number;
}

export interface SyncFs {
  list(): Promise<ShareFileInfo[]>;
  /** null if the file does not exist (at the moment) */
  read(path: string): Promise<string | null>;
  write(path: string, content: string): Promise<ShareFileInfo>;
}

export interface EntityVersion {
  rev: number;
  by: string;
  byName: string;
  /** Hash of the local state at this version ('deleted' = deleted) */
  hash: string;
}

interface FileState {
  mtimeMs: number;
  size: number;
  hash: string;
}

export interface SyncState {
  clock: number;
  versions: Record<string, EntityVersion>;
  /** Last seen files – so that not everything has to be re-read on startup */
  files: Record<string, FileState>;
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
  /** Display name of the entry, e.g. item name ('' for the project itself – the app names that kind) */
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

/** The shared folder cannot be used (e.g. it holds another project) – syncing has to stop. */
export class ShareFolderError extends CoreError {
  override readonly name = 'ShareFolderError';
}

/** Is version a newer than b? Ties are decided by the installation ID. */
function isNewer(a: { rev: number; by: string }, b: { rev: number; by: string } | undefined): boolean {
  if (!b) return true;
  return a.rev > b.rev || (a.rev === b.rev && a.by > b.by);
}

function envelopeRef(env: Envelope): EntityRef {
  return env.kind === 'project' ? { kind: 'project' } : { kind: env.kind, id: env.id };
}

function envelopeKey(env: Envelope): string {
  return entityKey(envelopeRef(env));
}

function labelOf(env: Envelope, local: Project): string {
  switch (env.kind) {
    case 'project':
      return '';
    case 'folder':
      return (env.data ?? local.folders[env.id])?.name ?? '';
    case 'item': {
      const item = env.data ?? local.items[env.id];
      return item ? itemLabel(item) : '';
    }
    default: {
      const entry: MediaEntry | undefined = env.data ?? mediaList(local, env.kind).find((e) => e.id === env.id);
      return entry ? mediaId<MediaKind>(env.kind, entry) : '';
    }
  }
}

/** A file read during a poll */
interface SeenFile extends FileState {
  path: string;
}

export class SyncEngine {
  readonly projectId: string;
  private versions: Map<string, EntityVersion>;
  private files: Map<string, FileState>;
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
    if (!project) throw new CoreError('sync.noProjectOpen');
    this.snapshot = project;
    this.projectId = project.id;
    this.versions = new Map(Object.entries(state?.versions ?? {}));
    this.files = new Map(Object.entries(state?.files ?? {}));
    this.clock = state?.clock ?? 0;
    // Everything that changed locally since the last sync (including deletions) must be written
    for (const key of new Set([...entityKeys(project), ...this.versions.keys()])) {
      const ref = parseEntityKey(key);
      if (ref && this.versions.get(key)?.hash !== hashData(localEntity(project, ref))) this.dirty.add(key);
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
      if (!ref) continue;
      const data = localEntity(this.snapshot, ref);
      const hash = hashData(data);
      let version = this.versions.get(key);
      if (isDirty && version?.hash !== hash) {
        if (!version && data === undefined) continue; // never shared, already deleted again
        version = { rev: this.tick(), by: this.identity.clientId, byName: this.identity.userName, hash };
      } else if (!isRewrite || !version) {
        continue; // nothing changed
      }
      const content = JSON.stringify(createEnvelope(ref, this.projectId, version, data));
      try {
        const info = await this.fs.write(entityPath(ref), content);
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

  /**
   * Reads changed files and applies newer versions of others. A file only counts as seen once its
   * change is applied (or needs none) – otherwise it is read again on the next poll.
   */
  private async pollNow(): Promise<RemoteChange[]> {
    const accepted: Array<{ env: Envelope; file: SeenFile }> = [];
    for (const info of await this.fs.list()) {
      if (this.stopped) return [];
      const ref = parseEntityPath(info.path);
      if (!ref) continue;
      const known = this.files.get(info.path);
      if (known && known.mtimeMs === info.mtimeMs && known.size === info.size) continue;
      const text = await this.fs.read(info.path);
      if (text === null) continue;
      const file: SeenFile = { path: info.path, mtimeMs: info.mtimeMs, size: info.size, hash: hashString(text) };
      if (known?.hash === file.hash) {
        this.recordFile(file);
        continue;
      }
      const env = parseEnvelope(text, ref);
      // Incomplete (e.g. currently being downloaded by the cloud service) – try again next time
      if (!env) continue;
      if (env.kind === 'project' && env.id !== this.projectId) {
        throw new ShareFolderError('sync.otherProjectInFolder');
      }
      this.clock = Math.max(this.clock, env.rev);
      const key = envelopeKey(env);
      const local = this.versions.get(key);
      if (isNewer(env, local)) {
        // An own, not yet written change is newer and will be written shortly
        if (!this.dirty.has(key)) {
          accepted.push({ env, file });
          continue;
        }
      } else if (local && (env.rev !== local.rev || env.by !== local.by)) {
        this.rewrite.add(key);
      }
      this.recordFile(file);
    }
    if (accepted.length === 0) return [];

    const before = this.host.getProject();
    if (!before || before.id !== this.projectId || this.stopped) return [];
    const envelopes = accepted.map((a) => a.env);
    const changes: RemoteChange[] = envelopes.map((env) => ({
      kind: env.kind,
      id: env.id,
      byName: env.byName,
      deleted: !!env.deleted,
      label: labelOf(env, before),
    }));
    this.applying = true;
    try {
      this.host.applyRemote((project) => applyRemoteEntities(project, envelopes, this.now()), changes);
    } finally {
      this.applying = false;
    }
    const after = this.host.getProject();
    if (!after || after.id !== this.projectId) return [];
    const acceptedKeys = new Set<string>();
    for (const { env, file } of accepted) {
      const key = envelopeKey(env);
      acceptedKeys.add(key);
      this.versions.set(key, { rev: env.rev, by: env.by, byName: env.byName, hash: hashData(localEntity(after, envelopeRef(env))) });
      this.recordFile(file);
    }
    // Entries that were only adjusted by cleaning up the folder structure still count as synced
    for (const key of changedEntityKeys(before, after)) {
      const ref = parseEntityKey(key);
      if (!ref || acceptedKeys.has(key) || this.dirty.has(key)) continue;
      const version = this.versions.get(key);
      if (version) this.versions.set(key, { ...version, hash: hashData(localEntity(after, ref)) });
      else this.dirty.add(key);
    }
    this.snapshot = after;
    return changes;
  }

  private recordFile({ path, ...state }: SeenFile): void {
    this.files.set(path, state);
  }
}

/** Reads a shared folder completely (to open a shared project). */
export async function readShareFolder(fs: SyncFs, now = Date.now()): Promise<{ project: Project; state: SyncState } | null> {
  const files: SyncState['files'] = {};
  const envelopes: Envelope[] = [];
  let meta: ProjectMeta | null = null;
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
    if (env.kind === 'project') {
      meta = env.deleted ? null : (env.data ?? null);
      envelopes.unshift(env);
    } else {
      envelopes.push(env);
    }
  }
  if (!meta) return null;
  const project = projectFromEnvelopes(meta, envelopes, now);
  const versions: SyncState['versions'] = {};
  for (const env of envelopes) {
    versions[envelopeKey(env)] = { rev: env.rev, by: env.by, byName: env.byName, hash: hashData(localEntity(project, envelopeRef(env))) };
  }
  // Entries that only exist due to the cleanup (e.g. the recovery folder) are written on startup
  return { project, state: { clock, versions, files } };
}
