/**
 * Gleicht ein Projekt mit einem geteilten Ordner ab – in beide Richtungen.
 *
 * - Lokale Änderungen werden pro Eintrag (Item, Ordner, Glyphe, Projektdaten) als eigene Datei geschrieben.
 * - Änderungen der anderen werden beim regelmäßigen Nachsehen eingelesen und übernommen.
 * - Haben zwei Personen denselben Eintrag geändert, gewinnt die neuere Fassung (logische Uhr `rev`);
 *   alle Beteiligten landen dadurch beim selben Stand.
 *
 * Der Abgleich kennt weder Electron noch den Browser: Dateizugriffe laufen über `SyncFs`,
 * das Projekt über `SyncHost`. Dadurch lässt er sich mit einem Speicher-Dateisystem testen.
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
  /** Pfad relativ zum geteilten Ordner, mit „/“ getrennt */
  path: string;
  mtimeMs: number;
  size: number;
}

export interface SyncFs {
  list(): Promise<SyncFileInfo[]>;
  /** null, wenn die Datei (gerade) nicht existiert */
  read(path: string): Promise<string | null>;
  write(path: string, content: string): Promise<SyncFileInfo>;
}

export interface EntityVersion {
  rev: number;
  by: string;
  byName: string;
  /** Hash des lokalen Stands zu dieser Version ('deleted' = gelöscht) */
  hash: string;
}

export interface SyncState {
  clock: number;
  versions: Record<string, EntityVersion>;
  /** Zuletzt gesehene Dateien – damit beim Start nicht alles neu gelesen werden muss */
  files: Record<string, { mtimeMs: number; size: number; hash: string }>;
}

export interface SyncIdentity {
  /** Zufällige, feste ID dieser Installation */
  clientId: string;
  /** Name, der bei den anderen angezeigt wird */
  userName: string;
}

export interface RemoteChange {
  kind: EntityKind;
  id: string;
  byName: string;
  deleted: boolean;
  /** Anzeigename des Eintrags, z.B. Item-Name */
  label: string;
}

export interface SyncHost {
  getProject(): Project | null;
  /** Änderungen der anderen übernehmen – darf nicht als eigene Änderung (Undo-Schritt) zählen */
  applyRemote(transform: (project: Project) => Project, changes: RemoteChange[]): void;
}

export interface SyncResult {
  applied: RemoteChange[];
  written: number;
}

/** Der Ordner gehört zu einem anderen Projekt o.ä. – Abgleich nicht möglich. */
export class ShareFolderError extends Error {}

/** Ist Fassung a neuer als b? Gleichstand wird über die Installations-ID entschieden. */
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
  }
}

export class SyncEngine {
  readonly projectId: string;
  private versions: Map<string, EntityVersion>;
  private files: Map<string, { mtimeMs: number; size: number; hash: string }>;
  private clock: number;
  private snapshot: Project;
  /** Lokal geänderte Einträge, die mit neuer Version geschrieben werden müssen */
  private dirty = new Set<string>();
  /** Einträge, deren Datei eine ältere Fassung enthält als wir – unsere wieder hinschreiben */
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
    // Alles, was sich seit dem letzten Abgleich lokal geändert hat (auch Gelöschtes), muss geschrieben werden
    const keys = new Set([...entityKeys(project), ...this.versions.keys()]);
    for (const key of keys) {
      if (this.versions.get(key)?.hash !== hashData(localEntity(project, key))) this.dirty.add(key);
    }
  }

  get state(): SyncState {
    return { clock: this.clock, versions: Object.fromEntries(this.versions), files: Object.fromEntries(this.files) };
  }

  /** Anzahl lokaler Änderungen, die noch nicht im Ordner sind */
  get pending(): number {
    return this.dirty.size + this.rewrite.size;
  }

  setUserName(userName: string) {
    this.identity = { ...this.identity, userName };
  }

  stop() {
    this.stopped = true;
  }

  /** Eine lokale Änderung melden (aus dem Store-Abo). Gibt true zurück, wenn etwas zu schreiben ist. */
  noteLocalChange(project: Project): boolean {
    if (this.applying || this.stopped || project.id !== this.projectId || project === this.snapshot) return false;
    for (const key of changedEntityKeys(this.snapshot, project)) this.dirty.add(key);
    this.snapshot = project;
    return this.dirty.size > 0;
  }

  /** Ausstehende lokale Änderungen schreiben. */
  flush(): Promise<number> {
    return this.serial(() => this.flushNow());
  }

  /** Änderungen der anderen einlesen und danach Ausstehendes schreiben. */
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
    // Projektdatei zuerst – sie kennzeichnet den Ordner als NexoBuilder-Projekt
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
        if (!version && data === undefined) continue; // nie geteilt, schon wieder gelöscht
        version = { rev: this.tick(), by: this.identity.clientId, byName: this.identity.userName, hash };
      } else if (!isRewrite || !version) {
        continue; // nichts geändert
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
      // Unvollständig (wird z.B. gerade vom Cloud-Dienst geladen) – beim nächsten Mal erneut versuchen
      if (!env) continue;
      if (env.kind === 'project' && env.id !== this.projectId) {
        throw new ShareFolderError('In diesem Ordner liegt ein anderes geteiltes Projekt.');
      }
      this.files.set(info.path, { mtimeMs: info.mtimeMs, size: info.size, hash });
      this.clock = Math.max(this.clock, env.rev);
      const key = entityKey(env.kind, env.id);
      const local = this.versions.get(key);
      if (isNewer(env, local)) {
        // Eine eigene, noch nicht geschriebene Änderung ist neuer und wird gleich geschrieben
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
    // Einträge, die nur durch das Aufräumen der Ordnerstruktur angepasst wurden, gelten weiter als abgeglichen
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

/** Liest einen geteilten Ordner komplett ein (zum Öffnen eines geteilten Projekts). */
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
  // Einträge, die es nur durch das Aufräumen gibt (z.B. „Wiederhergestellt“), werden beim Start geschrieben
  return { project, state: { clock, versions, files } };
}
