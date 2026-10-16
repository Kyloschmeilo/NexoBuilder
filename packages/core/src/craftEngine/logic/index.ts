/** The CraftEngine logic catalogs: conditions, functions, number providers, event triggers, loot sources and loot tables. */
import type { LogicCatalogName, LogicType } from './catalog';
import { CE_CONDITIONS } from './conditions';
import { CE_FUNCTIONS } from './functions';
import { CE_LOOT_ENTRIES, CE_LOOT_FUNCTIONS } from './loot';
import { CE_LOOT_SOURCES } from './lootSources';
import { CE_NUMBERS } from './numbers';
import { CE_TRIGGERS } from './triggers';

export * from './catalog';
export { CE_CONDITIONS } from './conditions';
export { CE_FUNCTIONS } from './functions';
export { CE_LOOT_ENTRIES, CE_LOOT_FUNCTIONS } from './loot';
export { CE_LOOT_SOURCES } from './lootSources';
export { lootTable } from './shared';
export { CE_NUMBERS } from './numbers';
export { CE_TRIGGERS, resolveTrigger, triggersFor } from './triggers';

/** Every catalog by name */
export const CE_LOGIC: Record<LogicCatalogName, readonly LogicType[]> = {
  conditions: CE_CONDITIONS,
  functions: CE_FUNCTIONS,
  numbers: CE_NUMBERS,
  triggers: CE_TRIGGERS,
  lootSources: CE_LOOT_SOURCES,
  lootEntries: CE_LOOT_ENTRIES,
  lootFunctions: CE_LOOT_FUNCTIONS,
};
