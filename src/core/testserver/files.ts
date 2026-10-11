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
  ];
}

/**
 * Setzt die nötigen Einstellungen in settings.yml. Alles andere (auch Kommentare) bleibt erhalten.
 * Gibt es die Datei noch nicht, entsteht eine kleine Datei – Nexo ergänzt den Rest beim Start.
 */
export function patchNexoSettings(current: string | null, options: NexoServerSettings): string {
  const doc = current?.trim() ? parseDocument(current, { version: '1.1' }) : new Document({}, { version: '1.1' });
  if (doc.errors.length > 0 || (doc.contents !== null && typeof doc.toJS() !== 'object')) {
    // Kaputte Datei nicht verschlimmbessern: nur unsere Werte neu schreiben
    return patchNexoSettings(null, options);
  }
  if (!current?.trim()) doc.commentBefore = ' Von NexoBuilder angelegt – Nexo ergänzt die übrigen Einstellungen beim Start.';
  for (const [path, value] of settingsOverrides(options)) {
    if (doc.getIn(path) === value) continue;
    // Fehlende oder falsche Zwischenebenen als normale Abschnitte anlegen
    for (let i = 1; i < path.length; i++) {
      const prefix = path.slice(0, i);
      if (!isMap(doc.getIn(prefix, true))) doc.setIn(prefix, doc.createNode({}));
    }
    doc.setIn(path, value);
  }
  const text = doc.toString({ lineWidth: 0 });
  return current !== null && text === current ? current : text;
}
