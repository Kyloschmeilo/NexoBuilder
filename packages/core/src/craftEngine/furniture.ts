/**
 * CraftEngine furniture: an item becomes furniture when its config holds a furniture definition in `furniture`
 * (settings, variants with elements, hitboxes and seats, loot). The export writes it under `furniture:` with the
 * item's key and makes the item place it (`furniture_item`). The placement rules per variant (`rules`) belong to that
 * item behavior; the editor keeps them in the definition, and the export moves them over.
 *
 * Keys, defaults and value formats come from the 26.9 plugin source (AbstractFurnitureManager, the element, hitbox and
 * seat configs, FurnitureItemBehavior) and the jar's default_assets/configuration/furniture examples.
 */
import { deepClone, deepMerge, isPlainObject } from '@resourcepackbuilder/utils';
import type { ConfigObject } from '../project/types';
import { ordered } from './yaml';

/** The variants the `furniture_item` behavior places: on top of a block, on its side, below it. */
export const CE_FURNITURE_ANCHORS = ['ground', 'wall', 'ceiling'] as const;
export type FurnitureAnchor = (typeof CE_FURNITURE_ANCHORS)[number];

/** Element types: five of the plugin and two of its model plugin compatibility (BetterModel, ModelEngine). */
export const CE_FURNITURE_ELEMENT_TYPES = [
  'item_display',
  'item',
  'block_display',
  'text_display',
  'armor_stand',
  'better_model',
  'model_engine',
] as const;

/** Hitbox types (BukkitFurnitureHitboxTypes); `interaction` is the default. */
export const CE_FURNITURE_HITBOX_TYPES = ['interaction', 'shulker', 'happy_ghast', 'custom'] as const;

/**
 * The keys only some hitbox types read (their factories in BukkitFurnitureHitboxTypes); every type also reads
 * position, scale, seats, blocks_building, can_be_hit_by_projectile and can_use_item_on.
 */
const HITBOX_TYPE_KEYS: Record<string, readonly string[]> = {
  interaction: ['width', 'height', 'interactive', 'invisible'],
  shulker: ['peek', 'direction', 'interaction_entity', 'interactive', 'invisible'],
  happy_ghast: ['hard_collision'],
  custom: ['entity_type', 'resource'],
};

/** Values of a placement rule (RotationRule, AlignmentRule), as CraftEngine reads them in lower case. */
export const CE_FURNITURE_ROTATIONS = ['any', 'four', 'eight', 'sixteen', 'north', 'east', 'west', 'south'] as const;
export const CE_FURNITURE_ALIGNMENTS = ['any', 'corner', 'center', 'half', 'quarter', 'center_quarter'] as const;

/** Display entity options (Billboard, ItemDisplayContext). */
export const CE_BILLBOARDS = ['fixed', 'vertical', 'horizontal', 'center'] as const;
export const CE_DISPLAY_TRANSFORMS = [
  'none',
  'third_person_left_hand',
  'third_person_right_hand',
  'first_person_left_hand',
  'first_person_right_hand',
  'head',
  'gui',
  'ground',
  'fixed',
  'on_shelf',
] as const;

/** Shulker hitbox directions (the side the shulker opens to). */
export const CE_SHULKER_DIRECTIONS = ['up', 'down', 'north', 'south', 'east', 'west'] as const;

/** CraftEngine's loot template that drops the item the furniture was placed with. */
export const CE_FURNITURE_LOOT_TEMPLATE = 'default:loot_table/furniture';

/** Element types that show an item (`item:`); an element of these without an item shows the furniture's own item. */
const ITEM_ELEMENT_TYPES = new Set(['item_display', 'item', 'armor_stand']);
/** The key an element of each type cannot do without. */
const REQUIRED_ELEMENT_KEY: Record<string, string> = {
  item_display: 'item',
  item: 'item',
  armor_stand: 'item',
  block_display: 'block',
  text_display: 'text',
  better_model: 'model',
  model_engine: 'model',
};

/** The keys a variant names its external model (BetterModel, ModelEngine) under, any one of them (`blueprint|…`). */
export const CE_FURNITURE_EXTERNAL_MODEL_KEYS = ['blueprint', 'better_model', 'model_engine'] as const;

/** Order of the keys of a furniture, of a variant, of an element and of a hitbox (as in the jar's examples). */
const FURNITURE_ORDER = ['settings', 'variants', 'variant', 'placement', 'entity_culling', 'behavior', 'behaviors', 'events', 'loot'];
/** The keys CraftEngine reads a furniture's variants from, in the order it tries them (`variant(s)|placement`) */
const VARIANTS_KEYS = ['variant', 'variants', 'placement'];
/** The keys CraftEngine reads a furniture's behaviors from (`behavior(s)`) */
const BEHAVIORS_KEYS = ['behavior', 'behaviors'];
const VARIANT_ORDER = ['loot_spawn_offset', ...CE_FURNITURE_EXTERNAL_MODEL_KEYS, 'elements', 'hitboxes', 'entity_culling'];
/** Element keys: what it shows, its transform, then its display parameters and the viewers it shows to. */
const ELEMENT_ORDER = [
  'type',
  'item',
  'block',
  'text',
  'model',
  'display_transform',
  'billboard',
  'position',
  'translation',
  'rotation',
  'yaw',
  'pitch',
  'scale',
  'small',
  'glow_color',
  'brightness',
  'view_range',
  'shadow_radius',
  'shadow_strength',
  'line_width',
  'background_color',
  'text_opacity',
  'has_shadow',
  'is_see_through',
  'use_default_background_color',
  'alignment',
  'sight_trace',
  'tints',
  'copy_data',
  'tint_source',
  'offset',
  'conditions',
];
const HITBOX_ORDER = [
  'type',
  'position',
  'width',
  'height',
  'scale',
  'peek',
  'direction',
  'entity_type',
  'interaction_entity',
  'blocks_building',
  'invisible',
  'interactive',
  'can_use_item_on',
  'can_be_hit_by_projectile',
  'hard_collision',
  'seats',
];

export type Vec3 = [number, number, number];
/** A quaternion as x, y, z, w (JOML order). */
export type Quat = [number, number, number, number];

/** The item's furniture definition, or null when the item is no furniture. */
export function craftEngineFurniture(config: ConfigObject): Record<string, unknown> | null {
  const furniture = config.furniture;
  return isPlainObject(furniture) ? furniture : null;
}

/** A new element showing the furniture's own item, its model standing on the block below. */
export function newFurnitureElement(): ConfigObject {
  return { type: 'item_display', position: '0,0.5,0' };
}

/** A new hitbox: an interaction entity of one block. */
export function newFurnitureHitbox(): ConfigObject {
  return { type: 'interaction', position: '0,0,0', width: 1, height: 1 };
}

/** A new variant with one element and one hitbox. */
export function newFurnitureVariant(): ConfigObject {
  return { elements: [newFurnitureElement()], hitboxes: [newFurnitureHitbox()] };
}

/**
 * A new furniture: placed on the ground, turned in quarter steps and centered on the block, dropping the item it was
 * placed with (CraftEngine's furniture loot template).
 */
export function newCraftEngineFurniture(): ConfigObject {
  return {
    rules: { ground: { rotation: 'four', alignment: 'center' } },
    variants: { ground: newFurnitureVariant() },
    loot: { template: CE_FURNITURE_LOOT_TEMPLATE },
  };
}

/** The variants of a furniture by name (CraftEngine also reads `variant` and the old `placement`). */
export function furnitureVariants(furniture: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const key = variantsKey(furniture);
  const variants = key === null ? undefined : furniture[key];
  if (!isPlainObject(variants)) return {};
  return Object.fromEntries(Object.entries(variants).map(([name, value]) => [name, isPlainObject(value) ? value : {}]));
}

/** The key the furniture's variants are under (`variants`, `variant` or `placement`), null without one. */
function variantsKey(furniture: Record<string, unknown>): string | null {
  return VARIANTS_KEYS.find((key) => furniture[key] !== undefined && furniture[key] !== null) ?? null;
}

/** The key the editor writes the furniture's variants to: the one CraftEngine reads them from, else `variants`. */
export function furnitureVariantsKey(furniture: Record<string, unknown>): string {
  return variantsKey(furniture) ?? 'variants';
}

/** A list of objects of a variant (`elements`, `hitboxes`); other entries are left out. */
export function variantList(variant: Record<string, unknown>, key: 'elements' | 'hitboxes'): Array<Record<string, unknown>> {
  const list = variant[key];
  return Array.isArray(list) ? list.filter(isPlainObject) : [];
}

/**
 * A type as CraftEngine looks it up: its registries hold element and hitbox types under the `craftengine` namespace
 * (Key.ce), which a type may name or leave out. Another namespace stays (CraftEngine knows no such type).
 */
const ceType = (type: string) => (type.startsWith('craftengine:') ? type.slice('craftengine:'.length) : type);

/** The type of an element: its own, or the one CraftEngine guesses from its keys (text, item, block), else null. */
export function furnitureElementType(element: Record<string, unknown>): string | null {
  if (typeof element.type === 'string') return ceType(element.type);
  if (element.text !== undefined) return 'text_display';
  if (element.item !== undefined) return 'item_display';
  if (element.block !== undefined) return 'block_display';
  return null;
}

/** The key an element of the type needs (`item`, `block`, `text`, `model`), undefined for an unknown type. */
export function requiredElementKey(type: string): string | undefined {
  return REQUIRED_ELEMENT_KEY[type];
}

/** The type of a hitbox (`interaction` when it sets none, as CraftEngine reads it). */
export function furnitureHitboxType(hitbox: Record<string, unknown>): string {
  return typeof hitbox.type === 'string' ? ceType(hitbox.type) : 'interaction';
}

/**
 * The hitbox as a hitbox of `type`: the keys only other types read (an interaction's `width` and `height` on a
 * shulker, say) are left out, since CraftEngine ignores them. A type CraftEngine does not know keeps every key.
 */
export function furnitureHitboxWithType<T extends Record<string, unknown>>(hitbox: T, type: string): T {
  const own = HITBOX_TYPE_KEYS[type];
  if (!own) return { ...hitbox, type };
  const foreign = new Set(Object.values(HITBOX_TYPE_KEYS).flatMap((keys) => keys.filter((key) => !own.includes(key))));
  return { ...(Object.fromEntries(Object.entries(hitbox).filter(([key]) => !foreign.has(key))) as T), type };
}

const toNumber = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** Numbers from a list or a comma separated text (CraftEngine drops `_` first), null if one is no number. */
function numberList(value: unknown): number[] | null {
  const parts = Array.isArray(value) ? value : typeof value === 'string' ? value.replace(/_/g, '').split(',') : [value];
  const numbers = parts.map(toNumber);
  return numbers.every((n) => n !== null) ? (numbers as number[]) : null;
}

/** A vector as CraftEngine reads it: `x,y,z`, a single number for all three, or a list of 3 (or 1); null if invalid. */
export function parseCeVector(value: unknown): Vec3 | null {
  const numbers = numberList(value);
  if (numbers?.length === 3) return numbers as Vec3;
  if (numbers?.length === 1) return [numbers[0], numbers[0], numbers[0]];
  return null;
}

/** A vector as the editor writes it (`0.5,0,0`, like the jar's examples). */
export function formatCeVector(vector: Vec3): string {
  return vector.map((n) => String(n)).join(',');
}

/**
 * CraftEngine's QuaternionUtils.toQuaternionf(yaw, pitch, roll) in radians: yaw turns around Z, pitch around Y and
 * roll around X (Z·Y·X).
 */
function eulerQuaternion(yaw: number, pitch: number, roll: number): Quat {
  const [cy, sy] = [Math.cos(yaw / 2), Math.sin(yaw / 2)];
  const [cp, sp] = [Math.cos(pitch / 2), Math.sin(pitch / 2)];
  const [cr, sr] = [Math.cos(roll / 2), Math.sin(roll / 2)];
  return [sr * cp * cy - cr * sp * sy, cr * sp * cy + sr * cp * sy, cr * cp * sy - sr * sp * cy, cr * cp * cy + sr * sp * sy];
}

const rad = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * An element's `rotation` (the display entity's left rotation) as CraftEngine reads it (ConfigValue.getAsQuaternion):
 * `x,y,z` in degrees, `y,z` (two values), a single angle around the vertical axis (number or text), or a quaternion
 * `x,y,z,w`. Null if invalid; a missing rotation is no rotation.
 */
export function parseCeRotation(value: unknown): Quat | null {
  if (value === undefined) return [0, 0, 0, 1];
  // A list of 3 is no rotation for CraftEngine (only the text form takes three angles)
  if (Array.isArray(value) && value.length !== 4 && value.length !== 1) return null;
  const n = numberList(value);
  if (!n) return null;
  switch (n.length) {
    case 4:
      return n as Quat;
    case 3:
      return eulerQuaternion(rad(n[2]), rad(n[1]), rad(n[0]));
    case 2:
      return eulerQuaternion(rad(n[1]), rad(n[0]), 0);
    case 1:
      return eulerQuaternion(0, -rad(n[0]), 0);
    default:
      return null;
  }
}

/** The three angles of a rotation the editor shows: `x,y,z`, a single angle as `0,-a,0`; null for other forms. */
export function rotationAngles(value: unknown): Vec3 | null {
  if (value === undefined) return [0, 0, 0];
  const n = Array.isArray(value) ? null : numberList(value);
  if (n?.length === 3) return n as Vec3;
  if (n?.length === 1) return [0, -n[0], 0];
  return null;
}

export interface FurnitureSeat {
  position: Vec3;
  /** The yaw the seat faces, relative to the furniture (null = none set, CraftEngine takes 0) */
  yaw: number | null;
  /**
   * Whether the player's view turns once on sitting down: `true` to the seat's yaw, a number to that angle, null not
   * at all (SeatConfig `force_player_rotation`)
   */
  forcePlayerRotation: number | true | null;
  /** Whether the player's body keeps to the seat's yaw (null = CraftEngine's default: when the seat sets a yaw) */
  limitPlayerRotation: boolean | null;
}

/** A seat's `force_player_rotation` as SeatConfig reads it: `true`, `false` (= null) or an angle; undefined if invalid. */
function forceRotation(value: unknown): number | true | null | undefined {
  if (value === true || (typeof value === 'string' && value.toLowerCase() === 'true')) return true;
  if (value === false || (typeof value === 'string' && value.toLowerCase() === 'false')) return null;
  return toNumber(value) ?? undefined;
}

/**
 * A seat as SeatConfig reads it: `x,y,z [yaw] [force_player_rotation]` or
 * `{ position, yaw, limit_player_rotation, force_player_rotation }`; null if invalid.
 */
export function parseFurnitureSeat(value: unknown): FurnitureSeat | null {
  if (isPlainObject(value)) {
    const position = parseCeVector(value.position);
    const yaw = value.yaw === undefined ? null : toNumber(value.yaw);
    const force = value.force_player_rotation === undefined ? null : forceRotation(value.force_player_rotation);
    const limit = value.limit_player_rotation;
    if (!position || (value.yaw !== undefined && yaw === null) || force === undefined) return null;
    if (limit !== undefined && typeof limit !== 'boolean') return null;
    return { position, yaw, forcePlayerRotation: force, limitPlayerRotation: limit ?? null };
  }
  if (typeof value !== 'string') return null;
  const [vector, yawText, forceText] = value.trim().split(/\s+/);
  const numbers = numberList(vector);
  if (numbers?.length !== 3) return null;
  const yaw = yawText === undefined ? null : toNumber(yawText);
  const force = forceText === undefined ? null : forceRotation(forceText);
  if ((yawText !== undefined && yaw === null) || force === undefined) return null;
  return { position: numbers as Vec3, yaw, forcePlayerRotation: force, limitPlayerRotation: null };
}

/**
 * A seat as the editor writes it: the text form (`0,0,-0.1 0`, like the jar's examples) where it says the same, else
 * the map form. The text form limits the body's rotation exactly when it has a yaw, and turns the view only with one.
 */
export function formatFurnitureSeat(seat: FurnitureSeat): string | ConfigObject {
  const position = formatCeVector(seat.position);
  const { yaw, forcePlayerRotation: force, limitPlayerRotation: limit } = seat;
  const asText = yaw === null ? force === null && limit !== true : limit !== false;
  if (asText) return [position, ...(yaw === null ? [] : [yaw]), ...(force === null ? [] : [force])].join(' ');
  return {
    position,
    ...(yaw !== null && { yaw }),
    ...(limit !== null && { limit_player_rotation: limit }),
    ...(force !== null && { force_player_rotation: force }),
  };
}

/**
 * An element (of a furniture or a block's entity renderer) with its type written out, and the furniture's or block's
 * own item when it shows an item but names none.
 */
export function builtDisplayElement(element: Record<string, unknown>, itemKey: string): Record<string, unknown> {
  const type = furnitureElementType(element) ?? (element.model === undefined ? 'item_display' : null);
  const result: Record<string, unknown> = type ? { ...element, type } : { ...element };
  if (type && ITEM_ELEMENT_TYPES.has(type) && result.item === undefined) result.item = itemKey;
  return ordered(result, ELEMENT_ORDER);
}

export interface BuiltFurniture {
  /** The entry under `furniture:` */
  furniture: Record<string, unknown>;
  /** The placement rules per variant for the item's `furniture_item` behavior (null = CraftEngine's defaults) */
  rules: Record<string, unknown> | null;
  /**
   * Further keys of the item's `furniture_item` behavior besides its type, furniture and rules (such as
   * `ignore_placer`), written next to them; empty when the definition sets none.
   */
  placementExtras?: Record<string, unknown>;
}

/** A hitbox with its type written out, without the keys only other types read, in the jar's key order. */
const builtHitbox = (hitbox: unknown) =>
  isPlainObject(hitbox) ? ordered(furnitureHitboxWithType(hitbox, furnitureHitboxType(hitbox)), HITBOX_ORDER) : hitbox;

/** A list of hitboxes as the export writes them (other values stay). */
const builtHitboxes = (list: unknown) => (Array.isArray(list) ? list.map(builtHitbox) : list);

/** A light of a glowing furniture written as text (`x,y,z level`) in its map form; other values stay. */
function lightObject(light: unknown): unknown {
  if (typeof light !== 'string') return light;
  const [vector, levelText, ...rest] = light.trim().split(/\s+/);
  const level = levelText === undefined ? null : toNumber(levelText);
  if (numberList(vector)?.length !== 3 || rest.length > 0 || (levelText !== undefined && level === null)) return light;
  return level === null ? { position: vector } : { position: vector, level };
}

const lightObjects = (list: unknown) => (Array.isArray(list) ? list.map(lightObject) : list);

/**
 * The furniture's behaviors (one or a list) with the lights of glowing furniture written as text (`"0,0.5,0 15"`, the
 * wiki's form) in the map form `{ position, level }` the editor shows; CraftEngine reads both alike.
 */
export function withLightObjects<T>(behaviors: T): T {
  const convert = (behavior: unknown) => {
    if (!isPlainObject(behavior) || behavior.type !== 'glowing_furniture') return behavior;
    const result: Record<string, unknown> = { ...behavior };
    if (result.lights !== undefined) result.lights = lightObjects(result.lights);
    if (isPlainObject(result.variants)) {
      result.variants = Object.fromEntries(Object.entries(result.variants).map(([name, lights]) => [name, lightObjects(lights)]));
    }
    return result;
  };
  return (Array.isArray(behaviors) ? behaviors.map(convert) : convert(behaviors)) as T;
}

/** A furniture behavior with the hitboxes it sets per variant built like the variants' own. */
function builtBehavior(behavior: unknown): unknown {
  if (!isPlainObject(behavior) || !isPlainObject(behavior.variants)) return behavior;
  const variants = Object.fromEntries(
    Object.entries(behavior.variants).map(([name, value]) =>
      isPlainObject(value) && value.hitboxes !== undefined ? [name, { ...value, hitboxes: builtHitboxes(value.hitboxes) }] : [name, value],
    ),
  );
  return { ...behavior, variants };
}

/**
 * The furniture as the export writes it: the additional YAML's `furniture:` merged over the definition (it wins), the
 * rules taken out for the item behavior, the furniture's item and loot argument filled in with the item's key, and the
 * types of elements and hitboxes written out (CraftEngine's docs advise it). Hitboxes lose the keys only other hitbox
 * types read.
 */
export function buildCraftEngineFurniture(
  source: Record<string, unknown>,
  rawFurniture: Record<string, unknown> | null,
  itemKey: string,
): BuiltFurniture {
  const merged = rawFurniture ? deepMerge(deepClone(source), rawFurniture) : deepClone(source);
  const rules = isPlainObject(merged.rules) && Object.keys(merged.rules).length > 0 ? merged.rules : null;
  delete merged.rules;

  const settings = isPlainObject(merged.settings) ? merged.settings : {};
  merged.settings = { item: itemKey, ...settings };

  const key = variantsKey(merged);
  const variants = key === null ? undefined : merged[key];
  if (key !== null && isPlainObject(variants)) {
    merged[key] = Object.fromEntries(
      Object.entries(variants).map(([name, value]) => {
        if (!isPlainObject(value)) return [name, value];
        const variant: Record<string, unknown> = { ...value };
        if (Array.isArray(variant.elements)) {
          variant.elements = variant.elements.map((e) => (isPlainObject(e) ? builtDisplayElement(e, itemKey) : e));
        }
        if (Array.isArray(variant.hitboxes)) variant.hitboxes = builtHitboxes(variant.hitboxes);
        return [name, ordered(variant, VARIANT_ORDER)];
      }),
    );
  }

  // CraftEngine 26.9 reads entity_culling next to the variants (for all of them); the wiki sets it per variant, so a
  // variant's culling is also written there when the furniture sets none
  if (merged.entity_culling === undefined) {
    const culling = Object.values(furnitureVariants(merged)).find((v) => v.entity_culling !== undefined)?.entity_culling;
    if (culling !== undefined) merged.entity_culling = deepClone(culling);
  }

  for (const key of BEHAVIORS_KEYS) {
    const behaviors = merged[key];
    if (behaviors !== undefined) merged[key] = Array.isArray(behaviors) ? behaviors.map(builtBehavior) : builtBehavior(behaviors);
  }

  const loot = merged.loot;
  if (isPlainObject(loot) && loot.template === CE_FURNITURE_LOOT_TEMPLATE) {
    const args = isPlainObject(loot.arguments) ? loot.arguments : {};
    if (args.item === undefined) merged.loot = { ...loot, arguments: { ...args, item: itemKey } };
  }
  return { furniture: ordered(merged, FURNITURE_ORDER), rules, placementExtras: {} };
}

// --- Preview geometry ---------------------------------------------------------------------------------------------

/** Where and how an element shows, in the furniture's own frame (blocks, as in the config). */
export interface FurnitureElementPose {
  type: string;
  /** The item it shows (null = the furniture's own item, or no item for blocks, texts and models) */
  item: string | null;
  position: Vec3;
  translation: Vec3;
  scale: Vec3;
  rotation: Quat;
  /** The element's own yaw and pitch on top of the furniture's, in degrees */
  yaw: number;
  pitch: number;
  displayTransform: string;
}

/**
 * The pose of an element for the preview; values CraftEngine cannot read fall back to their defaults (the export
 * reports them), a missing position to `defaultPosition`. Billboards are ignored, the preview shows each element as placed.
 */
export function furnitureElementPose(element: Record<string, unknown>, defaultPosition: Vec3 = [0, 0, 0]): FurnitureElementPose {
  const type = furnitureElementType(element) ?? 'item_display';
  const item = typeof element.item === 'string' && element.item.trim() ? element.item.trim() : null;
  // An armor stand's scale is one number; a small armor stand is half as big
  const scale = type === 'armor_stand' ? (toNumber(element.scale) ?? 1) * (element.small === true ? 0.5 : 1) : null;
  return {
    type,
    item,
    position: parseCeVector(element.position) ?? defaultPosition,
    translation: parseCeVector(element.translation) ?? [0, 0, 0],
    scale: scale !== null ? [scale, scale, scale] : (parseCeVector(element.scale) ?? [1, 1, 1]),
    rotation: parseCeRotation(element.rotation) ?? [0, 0, 0, 1],
    yaw: toNumber(element.yaw) ?? 0,
    pitch: toNumber(element.pitch) ?? 0,
    displayTransform: String(element.display_transform ?? element.display_context ?? 'none').toLowerCase(),
  };
}

export interface FurnitureBox {
  min: Vec3;
  max: Vec3;
}

/** Shulker.getPhysicalPeek: how far an open shulker reaches beyond its base (0–1 of its size). */
const physicalPeek = (peek: number) => 0.5 - Math.sin((0.5 + peek) * Math.PI) * 0.5;

/** Offsets of a shulker's opening per direction, in the furniture's frame (z as in the config: north is +z). */
const DIRECTION_AXES: Record<string, Vec3> = {
  up: [0, 1, 0],
  down: [0, -1, 0],
  east: [1, 0, 0],
  west: [-1, 0, 0],
  north: [0, 0, 1],
  south: [0, 0, -1],
};

/**
 * The width and height of an interaction hitbox: `scale: width,height` (one number for both) when it is set, else
 * `width` and `height`; null where it sets none (CraftEngine takes 1).
 */
export function interactionHitboxSize(hitbox: Record<string, unknown>): { width: number | null; height: number | null } {
  const scale = hitbox.scale === undefined ? null : numberList(hitbox.scale);
  if (scale) return { width: scale[0], height: scale[1] ?? scale[0] };
  return { width: toNumber(hitbox.width), height: toNumber(hitbox.height) };
}

/**
 * The space a hitbox takes, in the furniture's frame (blocks): a box standing on its position, centered on it
 * horizontally. Interaction: `width` × `height` (or `scale: width,height`); shulker: a cube of `scale` that opens by
 * `peek` towards `direction`; happy ghast: a 4-block cube of `scale`; custom: a cube of `scale` (the entity's own size
 * is unknown here).
 */
export function furnitureHitboxBox(hitbox: Record<string, unknown>): FurnitureBox {
  const [x, y, z] = parseCeVector(hitbox.position) ?? [0, 0, 0];
  const type = furnitureHitboxType(hitbox);
  const scale = numberList(hitbox.scale);
  const box = (width: number, height: number, depth = width): FurnitureBox => ({
    min: [x - width / 2, y, z - depth / 2],
    max: [x + width / 2, y + height, z + depth / 2],
  });
  if (type === 'interaction') {
    const size = interactionHitboxSize(hitbox);
    return box(size.width ?? 1, size.height ?? 1);
  }
  const size = scale?.length === 1 ? scale[0] : 1;
  if (type === 'happy_ghast') return box(4 * size, 4 * size);
  const result = box(size, size);
  if (type !== 'shulker') return result;
  const reach = physicalPeek((toNumber(hitbox.peek) ?? 0) * 0.01) * size;
  const axis = DIRECTION_AXES[String(hitbox.direction ?? 'up').toLowerCase()] ?? DIRECTION_AXES.up;
  axis.forEach((d, i) => {
    if (d > 0) result.max[i] += reach;
    if (d < 0) result.min[i] -= reach;
  });
  return result;
}

/** The seats of a hitbox that CraftEngine can read. */
export function hitboxSeats(hitbox: Record<string, unknown>): FurnitureSeat[] {
  const seats = Array.isArray(hitbox.seats) ? hitbox.seats : [];
  return seats.map(parseFurnitureSeat).filter((seat): seat is FurnitureSeat => seat !== null);
}
