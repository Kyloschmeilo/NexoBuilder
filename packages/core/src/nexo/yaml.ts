/** Nexo's item files: several entries in one file. */
import { toYaml, yamlHeader } from '../yaml';

/** Writes several entries into one file (separated by a blank line each), with an optional header comment. */
export function itemsToYaml(items: Array<{ id: string; config: Record<string, unknown> }>, description?: string): string {
  const body = items.map(({ id, config }) => toYaml({ [id]: config }).trimEnd()).join('\n\n') + '\n';
  return description ? yamlHeader(description) + body : body;
}
