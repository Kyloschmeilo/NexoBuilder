/**
 * Additional models of an item for specific states (Nexo "Special Item Appearance"):
 * drawing a bow, loaded crossbow, shield blocking, fishing rod cast, damage, dyed …
 * The keys match the Pack options from the Nexo docs (configuration/items/item-appearance).
 */
import { keySegment } from './messageKey';

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

export type VariantSlot = PackVariantSlot | 'gui_model' | ConnectSlot | PlacementSlot | 'light_on' | 'stack_models' | StateSlot;

/**
 * pack:       Nexo builds the model in via Pack.<slot>
 * definition: ResourcepackBuilder writes its own ItemModel (assets/<ns>/items/…) for the item
 * furniture:  model for furniture features (connecting, placement, light, states)
 * block:      additional block models (stack stages)
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
function variant(slot: Exclude<VariantSlot, StateSlot>, kind: VariantKind, suffix: string, { hint, ...options }: VariantOptions = {}): VariantDef {
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
    suffix: `state_${name.toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'state'}`,
  };
}

/** Path suffix of a variant model, e.g. "pulling_0" or "blocking". */
export function variantPathSuffix(def: VariantDef, index: number): string {
  return def.multiple ? `${def.suffix}_${index + (def.firstIndex ?? 0)}` : def.suffix;
}
