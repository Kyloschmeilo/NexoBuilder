/**
 * The behaviors a CraftEngine item gets in its YAML (`behavior` or `behaviors`, CraftEngine reads the first of them it
 * finds and takes a single behavior or a list in either):
 *  - the placement behavior: for an item with its own block or furniture, the kind of placement the config's
 *    `behavior` picks (or the default one), pointed at the item's key, with the keys that kind reads; for any other
 *    item, the config's `behavior` as it is (it names the block or furniture it places itself)
 *  - after it, the extra behaviors of the config's `behaviors` (range mining, composting …)
 * One behavior is written as `behavior`, more as the list `behaviors`. The additional YAML's `behavior:` (a mapping)
 * is merged into the placement behavior, its `behaviors:` (or a list in `behavior:`) is written in their place, after
 * the generated placement when it lists none (see writeBehaviors).
 */
import { deepMerge, isPlainObject } from '@resourcepackbuilder/utils';
import { ordered } from './yaml';

/** The placement behaviors of a block item: where the block may be placed (`BukkitItemBehaviors`) */
export const CE_BLOCK_PLACEMENTS = [
  'block_item',
  'ground_block_item',
  'wall_block_item',
  'ceiling_block_item',
  'double_high_block_item',
  'multi_high_block_item',
  'liquid_collision_block_item',
] as const;

/** The placement behaviors of a furniture item */
export const CE_FURNITURE_PLACEMENTS = ['furniture_item', 'liquid_collision_furniture_item'] as const;

/** Every placement behavior, block ones first */
export const CE_PLACEMENT_BEHAVIORS: readonly string[] = [...CE_BLOCK_PLACEMENTS, ...CE_FURNITURE_PLACEMENTS];

/** The liquids a liquid_collision_furniture_item may be placed on */
export const CE_PLACEMENT_LIQUIDS = ['water', 'lava'] as const;

/** The keys each placement behavior reads besides `type`, `block`/`furniture` and `rules` (plugin source) */
const FURNITURE_KEYS = ['ignore_placer', 'ignore_entities', 'against_blocks', 'against_block_tags', 'blacklist'];
const PLACEMENT_KEYS: Record<string, readonly string[]> = {
  liquid_collision_block_item: ['y_offset'],
  furniture_item: FURNITURE_KEYS,
  liquid_collision_furniture_item: [...FURNITURE_KEYS, 'source_only', 'liquid_type'],
};

/** Key order of a placement behavior */
const PLACEMENT_ORDER = ['type', 'block', 'furniture', 'rules', 'y_offset', ...PLACEMENT_KEYS.liquid_collision_furniture_item];

/** What the item places itself: its block (with the placement its block behavior needs) or its furniture */
export type OwnPlacement =
  | { kind: 'block'; key: string; defaultType: string }
  | { kind: 'furniture'; key: string; rules: Record<string, unknown> | null; extras?: Record<string, unknown> | null };

export interface PlacementResult {
  /** The placement behavior to write first (null: the item places nothing) */
  behavior: Record<string, unknown> | null;
  /** The type the config picked that does not fit what the item places (the default placement is written instead) */
  ignoredType: string | null;
}

const isFurnitureType = (type: unknown) => (CE_FURNITURE_PLACEMENTS as readonly unknown[]).includes(type);
const isBlockType = (type: unknown) => (CE_BLOCK_PLACEMENTS as readonly unknown[]).includes(type);

/**
 * The placement behavior of an item: for its own block or furniture, the type the config's `behavior` picks when it
 * fits (the default otherwise), the item's key, and only the keys that type reads; without either, the config's
 * `behavior` unchanged.
 */
export function placementBehavior(configured: unknown, own: OwnPlacement | null): PlacementResult {
  const config = isPlainObject(configured) ? configured : {};
  if (!own) return { behavior: Object.keys(config).length > 0 ? config : null, ignoredType: null };
  const picked = config.type;
  const fits = own.kind === 'block' ? isBlockType(picked) : isFurnitureType(picked);
  const type = fits ? (picked as string) : own.kind === 'block' ? own.defaultType : 'furniture_item';
  const ignoredType = picked !== undefined && !fits ? String(picked) : null;
  const keys = PLACEMENT_KEYS[type] ?? [];
  const extras = Object.fromEntries(Object.entries(config).filter(([key]) => keys.includes(key)));
  const behavior =
    own.kind === 'block'
      ? { type, block: own.key, ...extras }
      : { type, furniture: own.key, ...(own.rules && { rules: own.rules }), ...(own.extras ?? {}), ...extras };
  return { behavior: ordered(behavior, PLACEMENT_ORDER), ignoredType };
}

/** The extra behaviors of the config's `behaviors` (a single entry or a list) */
export function extraBehaviors(configured: unknown): unknown[] {
  if (configured === undefined || configured === null) return [];
  return Array.isArray(configured) ? configured : [configured];
}

/** Result of {@link writeBehaviors} */
export interface WrittenBehaviors {
  /** The additional YAML without the behavior keys handled here */
  raw: Record<string, unknown> | null;
  /** The additional YAML lists behaviors of its own, which take the place of the form's extra behaviors */
  rawListOverrides: boolean;
}

const entryType = (entry: unknown) => (isPlainObject(entry) && typeof entry.type === 'string' ? entry.type : null);

/**
 * Writes the placement and the extra behaviors into an item config (`behavior` for one, `behaviors` for more) and
 * folds the additional YAML's behaviors in. Its `behavior:` mapping is merged into the placement behavior (or added
 * first when there is none). Its `behaviors:` list (or a list in `behavior:`) is written instead of the generated
 * list, but keeps the generated placement in front when it has no placement behavior of its own, and the form's
 * extra behaviors of types it does not list after it, so the item still places its block or furniture.
 */
export function writeBehaviors(
  config: Record<string, unknown>,
  placement: Record<string, unknown> | null,
  extras: unknown[],
  rawItem: Record<string, unknown> | null,
): WrittenBehaviors {
  delete config.behavior;
  delete config.behaviors;
  const raw = rawItem ? { ...rawItem } : null;
  let list: unknown[];
  let rawListOverrides = false;
  if (raw && (raw.behaviors !== undefined || Array.isArray(raw.behavior))) {
    const rawList = extraBehaviors(raw.behaviors !== undefined ? raw.behaviors : raw.behavior);
    const rawTypes = new Set(rawList.map(entryType));
    const rawPlaces = [...rawTypes].some((type) => type !== null && CE_PLACEMENT_BEHAVIORS.includes(type));
    const kept = extras.filter((entry) => !rawTypes.has(entryType(entry)));
    list = [...(placement && !rawPlaces ? [placement] : []), ...rawList, ...kept];
    rawListOverrides = true;
    delete raw.behavior;
    delete raw.behaviors;
  } else {
    list = [...(placement ? [placement] : []), ...extras];
    if (raw && isPlainObject(raw.behavior)) {
      list = placement ? [deepMerge(placement, raw.behavior), ...extras] : [raw.behavior, ...extras];
      delete raw.behavior;
    }
  }
  if (list.length === 1) config.behavior = list[0];
  else if (list.length > 1) config.behaviors = list;
  return { raw, rawListOverrides };
}
