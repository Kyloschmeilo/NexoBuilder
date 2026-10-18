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
export function migrateNexoConfig(config: Record<string, unknown>): Record<string, unknown> {
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
