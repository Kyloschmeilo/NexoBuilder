/**
 * The states of a CraftEngine block. A block has either one `state` (one look, one internal state) or `states`:
 *  - `properties`: the internal properties (the plugin builds every combination of their values),
 *  - `appearances`: named looks, each with the keys of a single `state` (auto_state or state, model …),
 *  - `variants`: property combinations (`facing=north,open=true`) mapped to an appearance and/or settings.
 * `states` can also come from a template of CraftEngine's default templates pack (`template` + `arguments`), as the
 * jar's slabs, stairs and doors do.
 */
import { isPlainObject } from '@resourcepackbuilder/utils';
import type { ConfigObject } from '../project/types';
import { isTransparentState, rendererIsLook, turnRenderer } from './blockRenderer';

/**
 * The property types (the plugin's Properties registry). The editor offers these; `4-direction` and `6-direction`
 * are other names of `horizontal_direction` and `direction`.
 */
export const CE_PROPERTY_TYPES = [
  'boolean',
  'int',
  'string',
  'axis',
  'horizontal_direction',
  'direction',
  'single_block_half',
  'double_block_half',
  'hinge',
  'slab_type',
  'stairs_shape',
  'sofa_shape',
  'anchor_type',
  'bed_part',
] as const;

const PROPERTY_TYPE_ALIASES: Record<string, string> = { '4-direction': 'horizontal_direction', '6-direction': 'direction' };

/** The values of the enum types in the plugin's order (the first one is the default when none is set). */
const ENUM_VALUES: Record<string, string[]> = {
  axis: ['x', 'y', 'z'],
  horizontal_direction: ['north', 'east', 'south', 'west'],
  direction: ['down', 'up', 'north', 'south', 'west', 'east'],
  single_block_half: ['bottom', 'top'],
  double_block_half: ['upper', 'lower'],
  hinge: ['left', 'right'],
  slab_type: ['top', 'bottom', 'double'],
  stairs_shape: ['straight', 'inner_left', 'inner_right', 'outer_left', 'outer_right'],
  sofa_shape: ['straight', 'inner_left', 'inner_right'],
  anchor_type: ['floor', 'wall', 'ceiling'],
  bed_part: ['head', 'foot'],
};

/** The canonical property type of a type name (`4-direction` is `horizontal_direction`), undefined if unknown. */
export function canonicalPropertyType(type: unknown): string | undefined {
  if (typeof type !== 'string') return undefined;
  const name = PROPERTY_TYPE_ALIASES[type] ?? type;
  return (CE_PROPERTY_TYPES as readonly string[]).includes(name) ? name : undefined;
}

/** The int range of a property (`range: 1~7` or `min`/`max`), null if it has none. */
function intRange(def: Record<string, unknown>): [number, number] | null {
  if (def.range !== undefined) {
    const match = /^\s*(-?\d+)\s*~\s*(-?\d+)\s*$/.exec(String(def.range));
    return match ? [Number(match[1]), Number(match[2])] : null;
  }
  return Number.isInteger(def.min) && Number.isInteger(def.max) ? [def.min as number, def.max as number] : null;
}

/** All values a property can take, as strings; null when its definition is incomplete (no range, no values). */
export function propertyValues(def: unknown): string[] | null {
  if (!isPlainObject(def)) return null;
  const type = canonicalPropertyType(def.type);
  if (type === 'boolean') return ['true', 'false'];
  if (type === 'int') {
    const range = intRange(def);
    if (!range || range[1] < range[0]) return null;
    return Array.from({ length: range[1] - range[0] + 1 }, (_, i) => String(range[0] + i));
  }
  const listed = Array.isArray(def.values) ? def.values.map(String) : null;
  if (type === 'string') return listed && listed.length > 0 ? listed : null;
  if (!type) return null;
  return listed && listed.length > 0 ? listed : ENUM_VALUES[type];
}

/** The block's `states`, null when it has a single `state` (or none). */
export function blockStates(block: Record<string, unknown>): Record<string, unknown> | null {
  return isPlainObject(block.states) ? block.states : null;
}

/** The template a block's `states` come from (`default:block_state/slab`), null for states written out. */
export function statesTemplate(states: Record<string, unknown>): string | null {
  return typeof states.template === 'string' ? states.template : null;
}

/** A map entry of `states` (properties, appearances, variants), {} when it is missing. */
export function statesMap(states: Record<string, unknown>, key: 'properties' | 'appearances' | 'variants'): Record<string, unknown> {
  const value = states[key];
  return isPlainObject(value) ? value : {};
}

/** How many internal states the properties make (the product of their value counts); null if one is incomplete. */
export function internalStateCount(properties: Record<string, unknown>): number | null {
  let count = 1;
  for (const def of Object.values(properties)) {
    const values = propertyValues(def);
    if (!values) return null;
    count *= values.length;
  }
  return count;
}

/** The `property=value` pairs of a variant key (`facing=north,open=true`); null for a malformed pair. */
export function parseVariantKey(key: string): Array<[string, string]> | null {
  const pairs = key.split(',').map((part) => part.trim().split('='));
  if (pairs.some((pair) => pair.length !== 2 || !pair[0] || !pair[1])) return null;
  return pairs.map(([name, value]) => [name.trim(), value.trim()]);
}

/* ====================================================================== Templates */

export interface StateTemplate {
  /** The properties the template defines, by name, with their type */
  properties: Record<string, string>;
  /** The `auto_state` groups its appearances take (from its arguments); templates on a fixed vanilla block take none */
  autoStates?: (args: Record<string, unknown>) => string[];
  /** The argument naming the vanilla block whose states it borrows (two blocks on the same one clash) */
  baseArgument?: string;
}

const WATERLOGGED = { waterlogged: 'boolean' };

/** The block state templates of CraftEngine's default templates pack (block_states.yml) the editor uses. */
export const CE_STATE_TEMPLATES: Record<string, StateTemplate> = {
  'default:block_state/slab': { properties: { type: 'slab_type', ...WATERLOGGED }, baseArgument: 'slab_base_block' },
  'default:block_state/stairs': {
    properties: { facing: 'horizontal_direction', half: 'single_block_half', shape: 'stairs_shape', ...WATERLOGGED },
    baseArgument: 'stairs_base_block',
  },
  'default:block_state/door': {
    properties: { facing: 'horizontal_direction', half: 'double_block_half', hinge: 'hinge', open: 'boolean', powered: 'boolean' },
    baseArgument: 'door_base_block',
  },
  'default:block_state/trapdoor': {
    properties: { facing: 'horizontal_direction', half: 'single_block_half', open: 'boolean', powered: 'boolean', ...WATERLOGGED },
    baseArgument: 'trapdoor_base_block',
  },
  'default:block_state/fence_gate': {
    properties: { facing: 'horizontal_direction', in_wall: 'boolean', open: 'boolean', powered: 'boolean' },
    baseArgument: 'fence_gate_base_block',
  },
  // The fence's look comes from item displays (entity renderers), so blocks may share the vanilla fence
  'default:block_state/fence': {
    properties: { north: 'boolean', east: 'boolean', south: 'boolean', west: 'boolean', ...WATERLOGGED },
  },
  // The button's look comes from item displays too (pressed and not pressed)
  'default:block_state/button': { properties: { powered: 'boolean', face: 'anchor_type', facing: 'horizontal_direction' } },
  'default:block_state/leaves': {
    properties: { distance: 'int', persistent: 'boolean', ...WATERLOGGED },
    autoStates: (args) => {
      const group = args.leaves_tintable === true ? 'tintable_leaves' : 'non_tintable_leaves';
      return [group, `waterlogged_${group}`];
    },
  },
};

/** The template's arguments ({} when it has none). */
export function templateArguments(states: Record<string, unknown>): Record<string, unknown> {
  return isPlainObject(states.arguments) ? states.arguments : {};
}

/**
 * The block's properties by name with their canonical type: those written out, or those of a known template;
 * null when the block has a single state, or states from a template the editor does not know.
 */
export function blockPropertyTypes(block: Record<string, unknown>): Record<string, string | undefined> | null {
  const states = blockStates(block);
  if (!states) return null;
  const template = statesTemplate(states);
  if (template) return CE_STATE_TEMPLATES[template]?.properties ?? null;
  return Object.fromEntries(
    Object.entries(statesMap(states, 'properties')).map(([name, def]) => [
      name,
      canonicalPropertyType(isPlainObject(def) ? def.type : undefined),
    ]),
  );
}

/**
 * The looks of the block, each with the keys of a single state: the `state`, or the `appearances` of `states`
 * (empty for a template, whose appearances CraftEngine fills in).
 */
export function blockAppearances(block: Record<string, unknown>): Array<[string, Record<string, unknown>]> {
  const states = blockStates(block);
  if (!states) return isPlainObject(block.state) ? [['state', block.state]] : [];
  if (statesTemplate(states)) return [];
  return Object.entries(statesMap(states, 'appearances')).flatMap(([name, value]) =>
    isPlainObject(value) ? [[name, value] as [string, Record<string, unknown>]] : [],
  );
}

/* ====================================================================== Editing */

/** A new property of the type with its default (an int counts 0~3, a string has two values). */
export function newBlockProperty(type: string): ConfigObject {
  if (type === 'boolean') return { type, default: false };
  if (type === 'int') return { type, default: 0, range: '0~3' };
  if (type === 'string') return { type, default: 'a', values: ['a', 'b'] };
  return { type, default: ENUM_VALUES[type]?.[0] ?? '' };
}

/** Multi-state: the single state becomes the first appearance, `default`; no properties yet. */
export function toMultiState(block: ConfigObject): ConfigObject {
  const { state, ...rest } = block;
  const appearance = isPlainObject(state) ? state : {};
  return { ...rest, states: { properties: {}, appearances: { default: appearance }, variants: {} } };
}

/** Single state: the first appearance becomes the state (a template's states fall back to the default state). */
export function toSingleState(block: ConfigObject, fallback: ConfigObject): ConfigObject {
  const { states, ...rest } = block;
  const first = isPlainObject(states) && !statesTemplate(states) ? Object.values(statesMap(states, 'appearances'))[0] : undefined;
  return { ...rest, state: isPlainObject(first) ? (first as ConfigObject) : fallback };
}

/* ====================================================================== State builders */

/**
 * States with a boolean property `name` (default false) that switches between two appearances, `[off, on]`, each
 * taking a state of the auto_state group; `onSettings` are the block settings while it is true (a lit lamp's light).
 */
export function switchStates(name: string, [off, on]: [string, string], autoState: string, onSettings?: ConfigObject): ConfigObject {
  return {
    properties: { [name]: { type: 'boolean', default: false } },
    appearances: { [off]: { auto_state: autoState }, [on]: { auto_state: autoState } },
    variants: { [`${name}=false`]: { appearance: off }, [`${name}=true`]: { appearance: on, ...(onSettings && { settings: onSettings }) } },
  };
}

/** States with an int property `name` from `first` to `last`, one appearance per value (`<prefix><value>`). */
export function intStates(name: string, first: number, last: number, autoState: string, prefix: string): ConfigObject {
  const values = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  return {
    properties: { [name]: { type: 'int', default: first, range: `${first}~${last}` } },
    appearances: Object.fromEntries(values.map((i) => [`${prefix}${i}`, { auto_state: autoState }])),
    variants: Object.fromEntries(values.map((i) => [`${name}=${i}`, { appearance: `${prefix}${i}` }])),
  };
}

/** States with a property of an enum type (`sofa_shape` …), one appearance per value, named after it. */
export function enumStates(name: string, type: string, autoState: string): ConfigObject {
  const values = ENUM_VALUES[type] ?? [];
  return {
    properties: { [name]: { type, default: values[0] ?? '' } },
    appearances: Object.fromEntries(values.map((value) => [value, { auto_state: autoState }])),
    variants: Object.fromEntries(values.map((value) => [`${name}=${value}`, { appearance: value }])),
  };
}

/** States with these properties and one look (`default`) for all of them (a sapling's stages look the same). */
export function oneLookStates(properties: ConfigObject, autoState: string): ConfigObject {
  return { properties, appearances: { default: { auto_state: autoState } }, variants: {} };
}

/** The rotation of the model around the y axis that turns a block facing north to each horizontal direction. */
const FACING_ROTATION: Record<string, number> = { north: 0, east: 90, south: 180, west: 270 };
/** The rotation of the model around the x axis that turns a block facing north up or down. */
const VERTICAL_ROTATION: Record<string, number> = { up: 270, down: 90 };

/**
 * Makes the block face the player: a `facing` property (horizontal_direction, which CraftEngine sets on placement)
 * and each appearance four times (`<look>_<direction>`), its model and its entity renderer turned around the y axis. Each variant that picks
 * an appearance becomes one variant per direction (`facing=east,lit=true` picks `on_east`); variants with settings
 * only stay. Last, `facing=<direction>` picks the first appearance turned, for the states no other variant matches
 * (CraftEngine takes the appearance of the first matching variant). The model path is left to the export when an
 * appearance has none. With `type` `direction`, the block can also face up and down (its model turned around the x
 * axis; an entity renderer stays as it is for these two).
 */
export function withFacing(states: ConfigObject, type: 'horizontal_direction' | 'direction' = 'horizontal_direction'): ConfigObject {
  const directions =
    type === 'direction' ? [...Object.keys(FACING_ROTATION), ...Object.keys(VERTICAL_ROTATION)] : Object.keys(FACING_ROTATION);
  const appearances: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(statesMap(states, 'appearances'))) {
    const look: Record<string, unknown> = isPlainObject(value) ? value : {};
    const model = isPlainObject(look.model) ? look.model : {};
    // A transparent look, or a renderer on a fixed vanilla state, shows no model of its own: only the renderer turns
    const fixed = isTransparentState(look) || rendererIsLook(look);
    for (const direction of directions) {
      const turn = FACING_ROTATION[direction];
      if (turn === undefined) {
        const x = ((Number(model.x) || 0) + VERTICAL_ROTATION[direction]) % 360;
        appearances[`${name}_${direction}`] = fixed ? look : { ...look, model: { ...model, x } };
        continue;
      }
      const y = ((Number(model.y) || 0) + turn) % 360;
      const rotated: Record<string, unknown> = { ...model, y };
      if (y === 0) delete rotated.y;
      appearances[`${name}_${direction}`] = turnRenderer(fixed ? look : { ...look, model: rotated }, turn);
    }
  }
  const variants: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(statesMap(states, 'variants'))) {
    const appearance = isPlainObject(value) ? value.appearance : undefined;
    if (typeof appearance !== 'string') {
      variants[key] = value;
      continue;
    }
    for (const direction of directions) {
      variants[`facing=${direction},${key}`] = { ...(value as object), appearance: `${appearance}_${direction}` };
    }
  }
  const first = Object.keys(statesMap(states, 'appearances'))[0];
  if (first !== undefined) {
    for (const direction of directions) variants[`facing=${direction}`] = { appearance: `${first}_${direction}` };
  }
  return {
    ...states,
    properties: { ...statesMap(states, 'properties'), facing: { type, default: 'north' } },
    appearances,
    variants,
  } as ConfigObject;
}
