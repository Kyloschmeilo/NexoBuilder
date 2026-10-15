/**
 * Additional models of an item for specific states (Nexo "Special Item Appearance"):
 * drawing a bow, loaded crossbow, shield blocking, fishing rod cast, damage, dyed …
 * The keys match the Pack options from the Nexo docs (configuration/items/item-appearance).
 */
import type { MessageParams } from '../errors';
import type { ImportedModel, Item } from '../types';

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

export type ConnectSlot = 'connect_straight' | 'connect_left' | 'connect_right' | 'connect_inner' | 'connect_outer';
export type PlacementSlot = 'placement_floor' | 'placement_wall' | 'placement_roof';
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
  params?: MessageParams;
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

export const VARIANTS: VariantDef[] = [
  {
    slot: 'pulling_models',
    kind: 'pack',
    label: 'variants.pullingModels.label',
    description: 'variants.pullingModels.description',
    multiple: true,
    suffix: 'pulling',
    firstIndex: 0,
    materials: ['BOW', 'CROSSBOW'],
  },
  {
    slot: 'charged_model',
    kind: 'pack',
    label: 'variants.chargedModel.label',
    description: 'variants.chargedModel.description',
    multiple: false,
    suffix: 'charged',
    materials: ['CROSSBOW'],
  },
  {
    slot: 'firework_model',
    kind: 'pack',
    label: 'variants.fireworkModel.label',
    description: 'variants.fireworkModel.description',
    multiple: false,
    suffix: 'firework',
    materials: ['CROSSBOW'],
  },
  {
    slot: 'blocking_model',
    kind: 'pack',
    label: 'variants.blockingModel.label',
    description: 'variants.blockingModel.description',
    multiple: false,
    suffix: 'blocking',
    materials: ['SHIELD'],
    hint: 'variants.blockingModel.hint',
  },
  {
    slot: 'cast_model',
    kind: 'pack',
    label: 'variants.castModel.label',
    description: 'variants.castModel.description',
    multiple: false,
    suffix: 'cast',
    materials: ['FISHING_ROD'],
  },
  {
    slot: 'throwing_model',
    kind: 'pack',
    label: 'variants.throwingModel.label',
    description: 'variants.throwingModel.description',
    multiple: false,
    suffix: 'throwing',
    materials: ['TRIDENT'],
    hint: 'variants.throwingModel.hint',
  },
  {
    slot: 'damaged_models',
    kind: 'pack',
    label: 'variants.damagedModels.label',
    description: 'variants.damagedModels.description',
    multiple: true,
    suffix: 'damaged',
    firstIndex: 1,
    hint: 'variants.damagedModels.hint',
  },
  {
    slot: 'dyeable_model',
    kind: 'pack',
    label: 'variants.dyeableModel.label',
    description: 'variants.dyeableModel.description',
    multiple: false,
    suffix: 'dyeable',
    hint: 'variants.dyeableModel.hint',
  },
  {
    slot: 'composite_models',
    kind: 'pack',
    label: 'variants.compositeModels.label',
    description: 'variants.compositeModels.description',
    multiple: true,
    suffix: 'composite',
    firstIndex: 1,
  },
  {
    slot: 'gui_model',
    kind: 'definition',
    label: 'variants.guiModel.label',
    description: 'variants.guiModel.description',
    multiple: false,
    suffix: 'gui',
    hint: 'variants.guiModel.hint',
  },
];

/** Models for furniture features – shown in the model tab when the furniture mechanic is active */
export const FURNITURE_MODEL_SLOTS: VariantDef[] = [
  { slot: 'connect_straight', kind: 'furniture', label: 'variants.connectStraight.label', description: 'variants.connectStraight.description', multiple: false, suffix: 'straight' },
  { slot: 'connect_left', kind: 'furniture', label: 'variants.connectLeft.label', description: 'variants.connectLeft.description', multiple: false, suffix: 'left' },
  { slot: 'connect_right', kind: 'furniture', label: 'variants.connectRight.label', description: 'variants.connectRight.description', multiple: false, suffix: 'right' },
  { slot: 'connect_inner', kind: 'furniture', label: 'variants.connectInner.label', description: 'variants.connectInner.description', multiple: false, suffix: 'inner' },
  { slot: 'connect_outer', kind: 'furniture', label: 'variants.connectOuter.label', description: 'variants.connectOuter.description', multiple: false, suffix: 'outer' },
  { slot: 'placement_floor', kind: 'furniture', label: 'variants.placementFloor.label', description: 'variants.placementFloor.description', multiple: false, suffix: 'floor' },
  { slot: 'placement_wall', kind: 'furniture', label: 'variants.placementWall.label', description: 'variants.placementWall.description', multiple: false, suffix: 'wall' },
  { slot: 'placement_roof', kind: 'furniture', label: 'variants.placementRoof.label', description: 'variants.placementRoof.description', multiple: false, suffix: 'roof' },
  { slot: 'light_on', kind: 'furniture', label: 'variants.lightOn.label', description: 'variants.lightOn.description', multiple: false, suffix: 'light_on' },
];

export const CONNECT_SLOTS: Array<{ slot: ConnectSlot; state: string }> = [
  { slot: 'connect_straight', state: 'straight' },
  { slot: 'connect_left', state: 'left' },
  { slot: 'connect_right', state: 'right' },
  { slot: 'connect_inner', state: 'inner' },
  { slot: 'connect_outer', state: 'outer' },
];

export const PLACEMENT_SLOTS: Array<{ slot: PlacementSlot; placement: 'floor' | 'wall' | 'roof' }> = [
  { slot: 'placement_floor', placement: 'floor' },
  { slot: 'placement_wall', placement: 'wall' },
  { slot: 'placement_roof', placement: 'roof' },
];

/** Stack stages of a StringBlock (Mechanics.custom_block.stackable) */
export const STACK_MODELS: VariantDef = {
  slot: 'stack_models',
  kind: 'block',
  label: 'variants.stackModels.label',
  description: 'variants.stackModels.description',
  multiple: true,
  suffix: 'stack',
  firstIndex: 1,
};

export function stateSlot(name: string): StateSlot {
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
    suffix: `state_${name.toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'zustand'}`,
  };
}

export const VARIANT_BY_SLOT = new Map(VARIANTS.map((v) => [v.slot, v]));

export function getVariantModels(item: Item, slot: VariantSlot): ImportedModel[] {
  return item.variants?.[slot] ?? [];
}

/** All model slots with models (including furniture, state and block models) */
export function allVariantDefs(item: Item): VariantDef[] {
  const defs: VariantDef[] = [...VARIANTS, ...FURNITURE_MODEL_SLOTS, STACK_MODELS];
  for (const slot of Object.keys(item.variants ?? {})) {
    if (slot.startsWith('state:')) defs.push(stateDef(slot.slice('state:'.length)));
  }
  return defs;
}

export function activeVariantSlots(item: Item): VariantSlot[] {
  return VARIANTS.map((v) => v.slot).filter((slot) => item.variants?.[slot] !== undefined);
}

/** Path suffix of a variant model, e.g. "pulling_0" or "blocking". */
export function variantPathSuffix(def: VariantDef, index: number): string {
  return def.multiple ? `${def.suffix}_${index + (def.firstIndex ?? 0)}` : def.suffix;
}
