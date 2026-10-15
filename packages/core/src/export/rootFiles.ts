/**
 * sounds.yml and paintings.yml live directly in plugins/Nexo – there is only one file of each.
 * When exporting multiple projects, the entries are therefore combined into one file.
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
      '# Erstellt mit ResourcepackBuilder – ersetzt eine vorhandene sounds.yml. Eigene Einträge von dort bitte hier ergänzen.\n' +
        toYaml({ sounds }),
    );
  }
  const paintings = Object.assign({}, ...plans.map((p) => p.paintingEntries)) as Record<string, unknown>;
  if (Object.keys(paintings).length > 0) {
    files.set(
      PAINTINGS_FILE,
      '# Erstellt mit ResourcepackBuilder – ersetzt eine vorhandene paintings.yml. Neue Gemälde brauchen einen Server-Neustart.\n' +
        toYaml({ paintings }),
    );
  }
  return files;
}
