/**
 * Rewrites Nexo item configs saved by earlier versions to the keys Nexo 1.30 reads: renamed keys move, keys Nexo no
 * longer reads are dropped (or converted the way Nexo's own converter does), and boolean `cullable` becomes the
 * three-state value. Runs on every stored item and never changes a config that is already current.
 */
import { isPlainObject } from '@resourcepackbuilder/utils';

/** The object at `config[key]`, or undefined when that is no object. */
function section(parent: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = parent[key];
  return isPlainObject(value) ? value : undefined;
}

/** Returns the config in the current shape (a copy when something changed, the same object otherwise). */
export function migrateNexoConfig(current: Record<string, unknown>): Record<string, unknown> {
  const config = migrateNexoComponents(current);
  const mechanics = section(config, 'Mechanics');
  if (!mechanics) return config;
  const next: Record<string, unknown> = structuredClone(config);
  const nextMechanics = section(next, 'Mechanics') as Record<string, unknown>;
  let changed = false;

  const customBlock = section(nextMechanics, 'custom_block');
  if (customBlock && 'requires_supporting' in customBlock) {
    if (!('require_supporting' in customBlock)) customBlock.require_supporting = customBlock.requires_supporting;
    delete customBlock.requires_supporting;
    changed = true;
  }

  const misc = section(nextMechanics, 'misc');
  if (misc && ('burns_in_fire' in misc || 'burns_in_lava' in misc)) {
    // Nexo's converter turns "does not burn" into a damage_resistant component; "burns" is the default and vanishes.
    const fireproof = misc.burns_in_fire === false || misc.burns_in_lava === false;
    delete misc.burns_in_fire;
    delete misc.burns_in_lava;
    const components = section(next, 'Components');
    if (fireproof && !components?.damage_resistant) {
      if (components) components.damage_resistant = 'is_fire';
      else next.Components = { damage_resistant: 'is_fire' };
    }
    changed = true;
  }

  const repair = section(nextMechanics, 'repair');
  if (repair && 'nexo_durability_only' in repair) {
    delete repair.nexo_durability_only;
    changed = true;
  }

  const smelting = section(nextMechanics, 'smelting');
  if (smelting && 'enabled' in smelting) {
    delete smelting.enabled;
    changed = true;
  }

  const properties = section(section(nextMechanics, 'furniture') ?? {}, 'properties');
  if (properties && typeof properties.cullable === 'boolean') {
    properties.cullable = properties.cullable ? 'TRUE' : 'FALSE';
    changed = true;
  }

  return changed ? next : config;
}

/** Keys of `Components.custom_model_data` as the docs spell them, and the keys Nexo 1.30 reads instead */
const CUSTOM_MODEL_DATA_KEYS: Array<[docs: string, read: string]> = [
  ['floats', 'float'],
  ['colors', 'color'],
  ['strings', 'string'],
  ['flags', 'flag'],
];

/** Moves `object[from]` to `object[to]` (an existing `to` wins); whether the object changed. */
function renameKey(object: Record<string, unknown>, from: string, to: string): boolean {
  if (!(from in object)) return false;
  if (!(to in object)) object[to] = object[from];
  delete object[from];
  return true;
}

/**
 * Components whose keys Nexo 1.30 reads differently from the docs the editor followed before: the
 * custom_model_data lists (`floats` → `float` …) and the block list of can_place_on / can_break (`blocks` → `block`).
 */
function migrateNexoComponents(config: Record<string, unknown>): Record<string, unknown> {
  const components = section(config, 'Components');
  if (!components) return config;
  const next = structuredClone(config);
  const nextComponents = section(next, 'Components') as Record<string, unknown>;
  let changed = false;
  const modelData = section(nextComponents, 'custom_model_data');
  if (modelData) for (const [from, to] of CUSTOM_MODEL_DATA_KEYS) changed = renameKey(modelData, from, to) || changed;
  for (const key of ['can_place_on', 'can_break']) {
    const predicate = section(nextComponents, key);
    if (predicate) changed = renameKey(predicate, 'blocks', 'block') || changed;
  }
  return changed ? next : config;
}
