/**
 * Dateien für den lokalen Testserver: das Projekt so, wie es in plugins/Nexo/ liegt,
 * plus die Nexo-Einstellungen, damit das Resourcepack lokal (localhost) ausgeliefert wird.
 */
import { Document, isMap, parseDocument } from 'yaml';
import type { Project } from '../types';
import type { ExportPlan, FileContent } from '../export/plan';

export interface ServerFile {
  /** Pfad relativ zu plugins/Nexo */
  path: string;
  data: FileContent;
}

const PACK_NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;

/** Alle Projektdateien für plugins/Nexo (Resourcepack immer als Ordner, das lässt sich schneller abgleichen). */
export function nexoFolderFiles(project: Project, plan: ExportPlan): ServerFile[] {
  const packName = PACK_NAME_PATTERN.test(project.settings.packName) ? project.settings.packName : 'nexobuilder';
  const files: ServerFile[] = [];
  for (const map of [plan.itemFiles, plan.recipeFiles, plan.glyphFiles]) {
    for (const [path, data] of map) files.push({ path, data });
  }
  for (const [path, data] of plan.packFiles) files.push({ path: `pack/external_packs/${packName}/${path}`, data });
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export interface NexoServerSettings {
  /** Port, über den Nexo das Resourcepack ausliefert */
  packPort: number;
}

/** Werte, die NexoBuilder in plugins/Nexo/settings.yml setzt */
export function settingsOverrides(options: NexoServerSettings): Array<[string[], unknown]> {
  return [
    // Pack direkt vom eigenen Rechner ausliefern statt über einen Upload-Dienst
    [['Pack', 'server', 'type'], 'SELFHOST'],
    [['Pack', 'server', 'selfhost', 'port'], options.packPort],
    [['Pack', 'server', 'selfhost', 'public_address'], '127.0.0.1'],
    // Nach /nexo reload das neue Pack sofort an alle Spieler schicken
    [['Pack', 'dispatch', 'send_on_reload'], true],
    // Zum Testen unnötig, macht das Erstellen langsamer und nutzt einen Zwischenspeicher, der kaputtgehen kann
    [['Pack', 'obfuscation', 'type'], 'NONE'],
  ];
}

/**
 * Setzt die nötigen Einstellungen in settings.yml. Alles andere (auch Kommentare) bleibt erhalten.
 * Gibt es die Datei noch nicht, entsteht eine kleine Datei – Nexo ergänzt den Rest beim Start.
 * Stimmen alle Werte schon, kommt die Datei unverändert zurück (Nexo formatiert sie selbst um –
 * das darf nicht als Änderung zählen, sonst würde Nexo ständig neu geladen).
 */
export function patchNexoSettings(current: string | null, options: NexoServerSettings): string {
  const doc = current?.trim() ? parseDocument(current, { version: '1.1' }) : new Document({}, { version: '1.1' });
  if (doc.errors.length > 0 || (doc.contents !== null && typeof doc.toJS() !== 'object')) {
    // Kaputte Datei nicht verschlimmbessern: nur unsere Werte neu schreiben
    return patchNexoSettings(null, options);
  }
  if (!current?.trim()) doc.commentBefore = ' Von NexoBuilder angelegt – Nexo ergänzt die übrigen Einstellungen beim Start.';
  let changed = !current?.trim();
  for (const [path, value] of settingsOverrides(options)) {
    if (sameSetting(doc.getIn(path), value)) continue;
    changed = true;
    // Fehlende oder falsche Zwischenebenen als normale Abschnitte anlegen
    for (let i = 1; i < path.length; i++) {
      const prefix = path.slice(0, i);
      if (!isMap(doc.getIn(prefix, true))) doc.setIn(prefix, doc.createNode({}));
    }
    doc.setIn(path, value);
  }
  if (!changed && current !== null) return current;
  return doc.toString({ lineWidth: 0 });
}

/** Nexo schreibt Werte teils anders (z.B. Zahl als Text, Enum klein) – inhaltlich gleich ist gleich. */
function sameSetting(actual: unknown, wanted: unknown): boolean {
  if (actual === wanted) return true;
  if (typeof wanted === 'number') return Number(actual) === wanted;
  if (typeof wanted === 'string' && typeof actual === 'string') return actual.trim().toUpperCase() === wanted.toUpperCase();
  if (typeof wanted === 'boolean') return String(actual).toLowerCase() === String(wanted);
  return false;
}
