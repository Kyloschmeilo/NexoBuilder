/**
 * sounds.yml, paintings.yml and multipack.yml live directly in plugins/Nexo – there is only one file of each.
 * When exporting multiple projects, the entries are therefore combined into one file.
 */
import { MULTIPACK_FILE } from '@resourcepackbuilder/core/nexo';
import { toYaml, yamlHeader } from '@resourcepackbuilder/core/yaml';
import { isPlainObject } from '@resourcepackbuilder/utils';
import type { ExportPlan, NexoRootEntries } from '../../types';

export const SOUNDS_FILE = 'sounds.yml';
export const PAINTINGS_FILE = 'paintings.yml';
export { MULTIPACK_FILE };

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
  const multipack = mergeMultipack(entries);
  if (multipack) {
    files.set(MULTIPACK_FILE, yamlHeader('replaces an existing multipack.yml.') + toYaml(multipack));
  }
  return files;
}

/** The templates of all projects in one map (a later project's template of the same id wins), and the first menu. */
function mergeMultipack(entries: NexoRootEntries[]): Record<string, unknown> | null {
  const parts = entries.flatMap((entry) => (entry.multipack ? [entry.multipack] : []));
  if (parts.length === 0) return null;
  const templates = Object.assign({}, ...parts.map((part) => (isPlainObject(part.templates) ? part.templates : {})));
  const menu = parts.find((part) => part.menu !== undefined)?.menu;
  return { ...(Object.keys(templates).length > 0 && { templates }), ...(menu !== undefined && { menu }) };
}
