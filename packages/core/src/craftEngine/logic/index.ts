/** The CraftEngine logic catalogs: conditions, functions, number providers, event triggers and loot sources. */
import type { LogicCatalogName, LogicType } from './catalog';
import { CE_CONDITIONS } from './conditions';
import { CE_FUNCTIONS } from './functions';
import { CE_LOOT_SOURCES } from './lootSources';
import { CE_NUMBERS } from './numbers';
import { CE_TRIGGERS } from './triggers';

export * from './catalog';
export { CE_CONDITIONS } from './conditions';
export { CE_FUNCTIONS } from './functions';
export { CE_LOOT_SOURCES } from './lootSources';
export { CE_NUMBERS } from './numbers';
export { CE_TRIGGERS, triggersFor } from './triggers';

/** Every catalog by name */
export const CE_LOGIC: Record<LogicCatalogName, readonly LogicType[]> = {
  conditions: CE_CONDITIONS,
  functions: CE_FUNCTIONS,
  numbers: CE_NUMBERS,
  triggers: CE_TRIGGERS,
  lootSources: CE_LOOT_SOURCES,
};
