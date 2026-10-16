/**
 * sounds.yml and paintings.yml live directly in plugins/Nexo – there is only one file of each.
 * When exporting multiple projects, the entries are therefore combined into one file.
 */
import { toYaml, yamlHeader } from '@resourcepackbuilder/core/nexo';
import type { ExportPlan } from '../../types';

export const SOUNDS_FILE = 'sounds.yml';
export const PAINTINGS_FILE = 'paintings.yml';

/** The root files of the Nexo projects among `plans` (plans of other targets have no `nexo` part). */
export function buildRootFiles(plans: Array<Pick<ExportPlan, 'nexo'>>): Map<string, string> {
  const files = new Map<string, string>();
  const entries = plans.flatMap((p) => (p.nexo ? [p.nexo] : []));
  const sounds = entries.flatMap((e) => e.soundEntries);
  if (sounds.length > 0) {
    files.set(
      SOUNDS_FILE,
      yamlHeader('replaces an existing sounds.yml. Please add your own entries from there here.') + toYaml({ sounds }),
    );
  }
  const paintings: Record<string, Record<string, unknown>> = Object.assign({}, ...entries.map((e) => e.paintingEntries));
  if (Object.keys(paintings).length > 0) {
    files.set(
      PAINTINGS_FILE,
      yamlHeader('replaces an existing paintings.yml. New paintings need a server restart.') + toYaml({ paintings }),
    );
  }
  return files;
}
