/**
 * Additional models of an item for specific states (Nexo "Special Item Appearance"):
 * drawing a bow, loaded crossbow, shield blocking, fishing rod cast, damage, dyed …
 * The keys match the Pack options from the Nexo docs (configuration/items/item-appearance).
 */
import { normalizeTypedId } from '@resourcepackbuilder/minecraft';
import { isPlainObject, keySegment } from '@resourcepackbuilder/utils';
import type { ConfigObject } from './types';
import { getPath } from './config';

/** Variants that Nexo itself builds into the ItemModel via Pack.<slot> */
export type PackVariantSlot =
  | 'pulling_models'
  | 'charged_model'
  | 'firework_model'
  | 'blocking_model'
  | 'cast_model'
  | 'throwing_model'
  | 'damaged_models'
  | 'dyeable_model'
  | 'composite_models';

const CONNECT_STATES = ['straight', 'left', 'right', 'inner', 'outer'] as const;
const PLACEMENTS = ['floor', 'wall', 'roof'] as const;

export type ConnectSlot = `connect_${(typeof CONNECT_STATES)[number]}`;
export type PlacementSlot = `placement_${(typeof PLACEMENTS)[number]}`;
/** Model of a furniture state: "state:<name>" */
export type StateSlot = `state:${string}`;

/** Keys of Mechanics.furniture.states that are settings, not states. */
export const RESERVED_STATE_KEYS: readonly string[] = ['next_after', 'reset_after', 'condition'];
/** Characters a furniture state name may use. */
export const STATE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Faces of a directional custom block that can take a model of their own (the `<face>_model` keys of Nexo 1.30) */
export const DIRECTIONAL_FACES = ['x', 'y', 'z', 'north', 'south', 'east', 'west', 'up', 'down'] as const;
export type DirectionalFace = (typeof DIRECTIONAL_FACES)[number];
/** Model of one face of a directional block: "dir_<face>" */
export type DirectionalSlot = `dir_${DirectionalFace}`;

export type VariantSlot =
  PackVariantSlot | 'gui_model' | ConnectSlot | PlacementSlot | 'light_on' | 'stack_models' | DirectionalSlot | StateSlot;

/**
 * pack:       Nexo builds the model in via Pack.<slot>
 * definition: ResourcepackBuilder writes its own ItemModel (assets/<ns>/items/…) for the item
 * furniture:  model for furniture features (connecting, placement, light, states)
 * block:      additional block models (stack stages, faces of a directional block)
 */
export type VariantKind = 'pack' | 'definition' | 'furniture' | 'block';

export interface VariantDef {
  slot: VariantSlot;
  kind: VariantKind;
  /** Message key in the `schema` namespace */
  label: string;
  /** Message key in the `schema` namespace */
  description: string;
  /** ICU arguments for `label`, `description` and `hint` (e.g. the state name) */
  params?: Record<string, string>;
  /** Several models (list) instead of a single one */
  multiple: boolean;
  /** Part of the file name in the pack, e.g. "<id>-pulling_0" */
  suffix: string;
  /** First index for lists (pulling_0 … or damaged_1 …) */
  firstIndex?: number;
  /** Materials for which Minecraft knows this state */
  materials?: string[];
  /** Message key in the `schema` namespace */
  hint?: string;
}

interface VariantOptions extends Partial<Pick<VariantDef, 'multiple' | 'firstIndex' | 'materials'>> {
  /** The variant has a hint at `variants.<camel(slot)>.hint` */
  hint?: boolean;
}

/** A variant whose messages live at `variants.<camel(slot)>` */
function variant(
  slot: Exclude<VariantSlot, StateSlot>,
  kind: VariantKind,
  suffix: string,
  { hint, ...options }: VariantOptions = {},
): VariantDef {
  const scope = `variants.${keySegment(slot)}`;
  return {
    slot,
    kind,
    label: `${scope}.label`,
    description: `${scope}.description`,
    multiple: false,
    suffix,
    ...options,
    ...(hint && { hint: `${scope}.hint` }),
  };
}

export const VARIANTS: VariantDef[] = [
  variant('pulling_models', 'pack', 'pulling', { multiple: true, firstIndex: 0, materials: ['BOW', 'CROSSBOW'] }),
  variant('charged_model', 'pack', 'charged', { materials: ['CROSSBOW'] }),
  variant('firework_model', 'pack', 'firework', { materials: ['CROSSBOW'] }),
  variant('blocking_model', 'pack', 'blocking', { materials: ['SHIELD'], hint: true }),
  variant('cast_model', 'pack', 'cast', { materials: ['FISHING_ROD'] }),
  variant('throwing_model', 'pack', 'throwing', { materials: ['TRIDENT'], hint: true }),
  variant('damaged_models', 'pack', 'damaged', { multiple: true, firstIndex: 1, hint: true }),
  variant('dyeable_model', 'pack', 'dyeable', { hint: true }),
  variant('composite_models', 'pack', 'composite', { multiple: true, firstIndex: 1 }),
  variant('gui_model', 'definition', 'gui', { hint: true }),
];

/** Connectable furniture: one model per connection state */
export const CONNECT_SLOTS = CONNECT_STATES.map((state) => ({ slot: `connect_${state}` as const, state }));

/** Furniture placed on floor, wall or roof */
export const PLACEMENT_SLOTS = PLACEMENTS.map((placement) => ({ slot: `placement_${placement}` as const, placement }));

/** Models for furniture features – shown in the model tab when the furniture mechanic is active */
export const FURNITURE_MODEL_SLOTS: VariantDef[] = [
  ...CONNECT_SLOTS.map(({ slot, state }) => variant(slot, 'furniture', state)),
  ...PLACEMENT_SLOTS.map(({ slot, placement }) => variant(slot, 'furniture', placement)),
  variant('light_on', 'furniture', 'light_on'),
];

/** Stack stages of a StringBlock (Mechanics.custom_block.stackable) */
export const STACK_MODELS: VariantDef = variant('stack_models', 'block', 'stack', { multiple: true, firstIndex: 1 });

/** The faces each directional type of Nexo reads a variation and a model for (DirectionalBlock in Nexo 1.30). */
export const DIRECTIONAL_TYPE_FACES: Record<string, readonly DirectionalFace[]> = {
  LOG: ['y', 'x', 'z'],
  FURNACE: ['north', 'south', 'east', 'west'],
  DROPPER: ['north', 'south', 'east', 'west', 'up', 'down'],
  BARREL: ['north', 'south', 'east', 'west', 'up', 'down'],
};

/** Models of the faces of a directional NoteBlock (Mechanics.custom_block.directional.<face>_model) */
export const DIRECTIONAL_MODEL_SLOTS: VariantDef[] = DIRECTIONAL_FACES.map((face) => variant(`dir_${face}`, 'block', `dir_${face}`));

function stateSlot(name: string): StateSlot {
  return `state:${name}`;
}

export function stateDef(name: string): VariantDef {
  return {
    slot: stateSlot(name),
    kind: 'furniture',
    label: 'variants.state.label',
    description: 'variants.state.description',
    params: { name },
    multiple: false,
    suffix: `state_${normalizeTypedId(name) || 'state'}`,
  };
}

/* ------------------------------------------------------------------ mechanics the variants belong to */

/** The furniture mechanic in an item config. */
export const FURNITURE_PATH = ['Mechanics', 'furniture'];
/** The custom block mechanic in an item config. */
export const CUSTOM_BLOCK_PATH = ['Mechanics', 'custom_block'];
/** Where Nexo reads the stack stages of a StringBlock. */
export const STACKABLE_PATH = [...CUSTOM_BLOCK_PATH, 'stackable'];
/** Where Nexo reads the directional settings of a NoteBlock. */
export const DIRECTIONAL_PATH = [...CUSTOM_BLOCK_PATH, 'directional'];
/** The only custom block type with stack stages. */
export const STRINGBLOCK_TYPE = 'STRINGBLOCK';

/** The furniture mechanic of the config, or null when it is not active. */
export function furnitureConfig(config: ConfigObject): Record<string, unknown> | null {
  const furniture = getPath(config, FURNITURE_PATH);
  return isPlainObject(furniture) ? furniture : null;
}

/** The custom block mechanic of the config, or null when it is not active. */
export function customBlockConfig(config: ConfigObject): Record<string, unknown> | null {
  const block = getPath(config, CUSTOM_BLOCK_PATH);
  return isPlainObject(block) ? block : null;
}

/** Whether the config is a StringBlock, the custom block type that has stack stages. */
export function isStringBlock(config: ConfigObject): boolean {
  return customBlockConfig(config)?.type === STRINGBLOCK_TYPE;
}

/** The face a directional variant slot holds the model of, or null for any other slot. */
export function directionalFace(slot: VariantSlot): DirectionalFace | null {
  if (!slot.startsWith('dir_')) return null;
  const face = slot.slice('dir_'.length);
  return (DIRECTIONAL_FACES as readonly string[]).includes(face) ? (face as DirectionalFace) : null;
}

/** Where Nexo reads the model of a face of a directional block. */
export function directionalModelPath(face: DirectionalFace): string[] {
  return [...DIRECTIONAL_PATH, `${face}_model`];
}

/** The directional type of the config's custom block (LOG, FURNACE …), or null when it is not directional. */
export function directionalType(config: ConfigObject): string | null {
  const directional = getPath(config, DIRECTIONAL_PATH);
  return isPlainObject(directional) && typeof directional.type === 'string' ? directional.type : null;
}

/** The faces the config's directional block reads models for (none when the block is not directional). */
export function directionalFaces(config: ConfigObject): readonly DirectionalFace[] {
  const type = directionalType(config);
  return type ? (DIRECTIONAL_TYPE_FACES[type.toUpperCase()] ?? []) : [];
}

/** Path of a furniture state in the item config. */
export function furnitureStatePath(name: string): string[] {
  return [...FURNITURE_PATH, 'states', name];
}

/** Names of the furniture's states (without the settings next to them). */
export function furnitureStateNames(config: ConfigObject): string[] {
  const states = furnitureConfig(config)?.states;
  return isPlainObject(states) ? Object.keys(states).filter((key) => !RESERVED_STATE_KEYS.includes(key)) : [];
}

export type StateNameError = 'required' | 'invalid' | 'taken';

/** Why `name` (trimmed) cannot name a new furniture state of the config. */
export function stateNameError(config: ConfigObject, name: string): StateNameError | null {
  const trimmed = name.trim();
  if (!trimmed) return 'required';
  if (!STATE_NAME_PATTERN.test(trimmed)) return 'invalid';
  if (RESERVED_STATE_KEYS.includes(trimmed) || furnitureStateNames(config).includes(trimmed)) return 'taken';
  return null;
}

/** Where a variant is written in the item config (Pack.<slot>, the stack stages); null when it gets its own item model. */
export function variantConfigPath(def: VariantDef): string[] | null {
  switch (def.kind) {
    case 'pack':
      return ['Pack', def.slot];
    case 'block': {
      const face = directionalFace(def.slot);
      return face ? directionalModelPath(face) : STACKABLE_PATH;
    }
    default:
      return null;
  }
}

/** Path suffix of a variant model, e.g. "pulling_0" or "blocking". */
export function variantPathSuffix(def: VariantDef, index: number): string {
  return def.multiple ? `${def.suffix}_${index + (def.firstIndex ?? 0)}` : def.suffix;
}
