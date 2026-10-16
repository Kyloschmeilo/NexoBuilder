/** The loot sources of a CraftEngine project (`project.craftEngine.lootSources`). */
import { type ConfigObject, toConfigValue } from '@resourcepackbuilder/core/project';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { mutate } from '../store/project';

/** Replaces the loot sources; without any, the key (and an empty `craftEngine`) is removed. */
export function setLootSources(value: unknown): void {
  const config = toConfigValue(value);
  const sources: ConfigObject[] = Array.isArray(config) ? config.filter((entry): entry is ConfigObject => isPlainObject(entry)) : [];
  mutate((draft) => {
    const data = { ...draft.craftEngine };
    if (sources.length > 0) data.lootSources = sources;
    else delete data.lootSources;
    if (Object.keys(data).length > 0) draft.craftEngine = data;
    else delete draft.craftEngine;
  }, 'lootSources');
}
