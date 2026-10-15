/**
 * sounds.yml und paintings.yml liegen direkt in plugins/Nexo – es gibt jeweils nur eine Datei.
 * Beim Export mehrerer Projekte werden die Einträge deshalb zu einer Datei zusammengefasst.
 */
import { toYaml } from '../nexo/yaml';

export const SOUNDS_FILE = 'sounds.yml';
export const PAINTINGS_FILE = 'paintings.yml';

export interface RootEntries {
  soundEntries: Array<Record<string, unknown>>;
  paintingEntries: Record<string, Record<string, unknown>>;
}

export function buildRootFiles(plans: RootEntries[]): Map<string, string> {
  const files = new Map<string, string>();
  const sounds = plans.flatMap((p) => p.soundEntries);
  if (sounds.length > 0) {
    files.set(
      SOUNDS_FILE,
      '# Erstellt mit NexoBuilder – ersetzt eine vorhandene sounds.yml. Eigene Einträge von dort bitte hier ergänzen.\n' +
        toYaml({ sounds }),
    );
  }
  const paintings = Object.assign({}, ...plans.map((p) => p.paintingEntries)) as Record<string, unknown>;
  if (Object.keys(paintings).length > 0) {
    files.set(
      PAINTINGS_FILE,
      '# Erstellt mit NexoBuilder – ersetzt eine vorhandene paintings.yml. Neue Gemälde brauchen einen Server-Neustart.\n' +
        toYaml({ paintings }),
    );
  }
  return files;
}
