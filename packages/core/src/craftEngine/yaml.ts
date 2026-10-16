/** CraftEngine's configuration files: top-level sections (`items:`, `blocks:` …) holding entries by their key. */
import { toYaml, yamlHeader } from '../yaml';

/** The sections of one configuration file; each maps an entry's key (namespace:id) to its config. */
export interface CraftEngineSections {
  items?: Record<string, Record<string, unknown>>;
  blocks?: Record<string, Record<string, unknown>>;
  furniture?: Record<string, Record<string, unknown>>;
  recipes?: Record<string, Record<string, unknown>>;
}

const SECTION_ORDER: Array<keyof CraftEngineSections> = ['items', 'blocks', 'furniture', 'recipes'];

/** Writes the non-empty sections, separated by a blank line, with an optional header comment. */
export function sectionsToYaml(sections: CraftEngineSections, description?: string): string {
  const body = SECTION_ORDER.flatMap((key) => {
    const entries = sections[key];
    return entries && Object.keys(entries).length > 0 ? [toYaml({ [key]: entries }).trimEnd()] : [];
  }).join('\n\n');
  const text = body ? body + '\n' : '';
  return description ? yamlHeader(description) + text : text;
}
