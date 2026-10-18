/**
 * The furniture behaviors (`BukkitFurnitureBehaviors`, checked against the plugin's registry; 3): a storage, item
 * display slots and light sources. A furniture lists them under `behaviors` (or `behavior`). Each type can set its
 * own interaction hitboxes per variant (`variants: { <variant>: { hitboxes } }`); the glowing furniture sets its
 * lights for every variant (`lights`) or per variant. No type is Premium only.
 *
 * Also the field specs of a hitbox and of a sound, which the furniture's own variants and settings use too.
 * Keys and defaults come from the 26.9 plugin source (the behavior templates, the hitbox configs and SoundData).
 */
import { field, type FieldSpec, type FieldSpecs, whenType } from '../../form/build';
import { plainOptions } from '../../form/options';
import { CE_DOCS } from '../form/schema/docs';
import { CE_FURNITURE_HITBOX_TYPES, CE_SHULKER_DIRECTIONS } from '../furniture';
import { logicCatalog } from './catalog';

/** The variants hitboxes are usually set for (the ones the `furniture_item` behavior places) */
const VARIANT_NAMES = plainOptions(['ground', 'wall', 'ceiling']);

/**
 * The keys of a hitbox, each shown for the types that read it (their factories in BukkitFurnitureHitboxTypes). Seats
 * are left out: a behavior's hitboxes are for clicking (a furniture's own hitboxes have the seat editor), and seats a
 * hitbox has keep their place.
 */
export function hitboxFieldSpecs(): FieldSpecs {
  return {
    type: field.select(plainOptions(CE_FURNITURE_HITBOX_TYPES), { allowCustom: true }),
    position: field.text({ format: 'vector', placeholder: true }),
    width: field.number({ min: 0, ...whenType('interaction') }),
    height: field.number({ min: 0, ...whenType('interaction') }),
    scale: field.number({ min: 0, ...whenType('shulker', 'happy_ghast', 'custom') }),
    peek: field.number({ integer: true, min: 0, max: 100, ...whenType('shulker') }),
    direction: field.select(plainOptions(CE_SHULKER_DIRECTIONS), whenType('shulker')),
    entity_type: field.text({ format: 'resource', placeholder: true, ...whenType('custom') }),
    interactive: field.boolean({ defaultHint: true, ...whenType('interaction', 'shulker') }),
    blocks_building: field.boolean({ defaultHint: true }),
    can_use_item_on: field.boolean({ defaultHint: true }),
    can_be_hit_by_projectile: field.boolean({ defaultHint: true }),
    invisible: field.boolean({ defaultHint: false, ...whenType('interaction', 'shulker') }),
    interaction_entity: field.boolean({ defaultHint: true, ...whenType('shulker') }),
    hard_collision: field.boolean({ defaultHint: true, ...whenType('happy_ghast') }),
  };
}

/** A list of hitboxes; all lists share the messages at `furniture.hitbox` */
function hitboxList(): FieldSpec {
  return field.objectList(hitboxFieldSpecs(), {
    scope: 'furniture.hitbox',
    titleKey: 'type',
    newItem: () => ({ type: 'interaction', position: '0,0,0', width: 1, height: 1 }),
  });
}

/**
 * A sound as SoundData reads it: an id, or `{ id, volume, pitch }`. The messages are shared (`furniture.sound`).
 */
export function soundFieldSpec(): FieldSpec {
  return field.choice(
    {
      id: {
        field: field.text({ format: 'resource', placeholder: true }),
        matches: (value) => typeof value === 'string',
        newValue: () => '',
      },
      detailed: {
        field: field.object({
          id: field.text({ format: 'resource', placeholder: true }),
          volume: field.number({ min: 0 }),
          pitch: field.number({ min: 0 }),
        }),
        matches: (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
        newValue: () => ({ id: '' }),
      },
    },
    { scope: 'furniture.sound' },
  );
}

/** The `variants` of a behavior: per variant name, its keys */
const perVariant = (fields: FieldSpecs) => field.map(field.object(fields), { keyOptions: VARIANT_NAMES, newValue: () => ({}) });

/** A light of a glowing furniture: where (from the furniture's origin) and how bright */
const lightList = () =>
  field.objectList(
    { position: field.text({ format: 'vector', placeholder: true }), level: field.number({ integer: true, min: 1, max: 15 }) },
    { scope: 'furniture.light', newItem: () => ({ position: '0,0,0', level: 15 }) },
  );

const behaviorDocs = (type: string) => `${CE_DOCS.furnitureBehaviors}/${type}`;

export const CE_FURNITURE_BEHAVIORS = logicCatalog('furnitureBehaviors', [
  {
    type: 'simple_storage_furniture',
    docs: behaviorDocs('simple_storage_furniture'),
    fields: {
      title: field.text({ format: 'minimessage', placeholder: true }),
      rows: field.number({ integer: true, min: 1, max: 6 }),
      data_key: field.text({ placeholder: true, help: true }),
      sounds: field.object({ open: soundFieldSpec(), close: soundFieldSpec() }),
      variants: perVariant({ hitboxes: hitboxList() }),
    },
  },
  {
    type: 'display_item_furniture',
    docs: behaviorDocs('display_item_furniture'),
    fields: {
      data_key: field.text({ placeholder: true, help: true }),
      sounds: field.object({ put: soundFieldSpec(), take: soundFieldSpec() }),
      variants: perVariant({ item_position: field.text({ format: 'vector', placeholder: true }), hitboxes: hitboxList() }),
    },
  },
  {
    type: 'glowing_furniture',
    docs: behaviorDocs('glowing_furniture'),
    fields: {
      lights: lightList(),
      variants: field.map(lightList(), { keyOptions: VARIANT_NAMES, newValue: () => [] }),
    },
  },
]);
