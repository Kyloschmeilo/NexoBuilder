/**
 * The item settings (`settings`): mechanics CraftEngine implements itself. Keys, forms and defaults follow the plugin
 * source (`ItemSettingsModifiers`, 26.9) and the wiki's settings page, where each property links to its section.
 *
 * Keys only on the wiki (`anvil_repair_material`, `drag_repair_material`, `hat_height`) are documented for plugin
 * versions after 26.9, keys only in the source (`disable_vanilla_behavior`, `trigger_advancement`) have no wiki
 * section; both are advanced, and their descriptions say which plugin version reads them.
 */
import { isPlainObject } from '@resourcepackbuilder/utils';
import { CE_DAMAGE_CAUSES, CE_EQUIPMENT_SLOTS, CE_GLOW_COLORS, CE_ITEM_TAGS } from '../options';
import { ARMOR_PROPERTY } from '../../../form/armor';
import { type ChoiceSpec, field, type FieldSpec, type FieldSpecs, properties, type PropertySpec } from '../../../form/build';
import { plainOptions } from '../../../form/options';
import { attributeModifierList, equipmentPotionEffectList, equipmentSetPartList } from '../../attributes';
import { CE_BILLBOARDS, CE_DISPLAY_TRANSFORMS } from '../../furniture';
import { numberProvider } from '../../logic/shared';
import { withDocs } from '../../../form/docs';
import { CE_DOCS, ceItemSettingDocs } from './docs';

/** A sound as CraftEngine reads it (SoundData): its id, or `{id, volume, pitch}` with number formats */
function sound(): FieldSpec {
  return field.choice(
    {
      id: { field: field.text({ placeholder: true }), matches: (value) => typeof value === 'string', newValue: () => '' },
      detailed: {
        field: field.object({ id: field.text({ placeholder: true }), volume: numberProvider(), pitch: numberProvider() }),
        matches: (value) => isPlainObject(value) && value.default === undefined,
        newValue: () => ({ id: '' }),
      },
    },
    { scope: 'itemSettings.sound' },
  );
}

/** A projectile's hit sound (TargetBasedSound): a sound, or a default sound with overrides per hit block or entity */
function targetSound(): FieldSpec {
  return field.choice(
    {
      id: { field: field.text({ placeholder: true }), matches: (value) => typeof value === 'string', newValue: () => '' },
      byTarget: {
        field: field.object({
          default: field.text({ placeholder: true }),
          overrides: field.map(field.text({ placeholder: true }), { keyPlaceholder: true, help: true }),
        }),
        matches: (value) => isPlainObject(value) && value.default !== undefined,
        newValue: () => ({ default: '' }),
      },
    },
    { scope: 'itemSettings.targetSound' },
  );
}

/** One repair entry: which items (ids or `#tags`) in `key` it repairs and how much durability it restores */
const repairEntry = (key: 'target' | 'material', extra: FieldSpecs = {}) =>
  field.objectList(
    {
      [key]: field.stringList({ placeholder: true, singleAsString: true }),
      amount: field.number({ min: 0 }),
      percent: field.number({ min: 0, max: 1, step: 0.05 }),
      ...extra,
    },
    { newItem: () => ({ [key]: [''], amount: 20 }) },
  );

const chance = () => field.number({ min: 0, max: 1, step: 0.05 });

const isType = (type: string) => (value: unknown) => isPlainObject(value) && value.type === type;

/**
 * What crafting leaves of the item (CraftRemainders): an item id, a fixed item and count, damage to the item, or
 * (`top`) a remainder per recipe with a fallback. All forms share the messages at `itemSettings.craftRemainder`.
 */
function craftRemainder(top: boolean, label?: string): FieldSpec {
  const choices: Record<string, ChoiceSpec> = {
    item: {
      field: field.text({ format: 'resource', placeholder: true }),
      matches: (value) => typeof value === 'string',
      newValue: () => '',
    },
    fixed: {
      field: field.object({ item: field.text({ format: 'resource', placeholder: true }), count: numberProvider() }),
      matches: isType('fixed'),
      newValue: () => ({ type: 'fixed', item: '' }),
    },
    hurt_and_break: {
      field: field.object({ damage: field.number({ integer: true, min: 0 }) }),
      matches: isType('hurt_and_break'),
      newValue: () => ({ type: 'hurt_and_break', damage: 1 }),
    },
  };
  if (top) {
    choices.recipe_based = {
      field: field.object({
        terms: field.objectList(
          {
            recipes: field.stringList({ format: 'resource', placeholder: true }),
            craft_remainder: craftRemainder(false, 'itemSettings.craftRemainder.termLabel'),
          },
          { newItem: () => ({ recipes: [''], craft_remainder: '' }) },
        ),
        fallback: craftRemainder(false, 'itemSettings.craftRemainder.fallbackLabel'),
      }),
      matches: isType('recipe_based'),
      newValue: () => ({ type: 'recipe_based', terms: [{ recipes: [''], craft_remainder: '' }] }),
    };
  }
  return field.choice(choices, { scope: 'itemSettings.craftRemainder', ...(label && { label }) });
}

/** The heading of each setting's section on the wiki page where it is not the key itself */
const HEADINGS: Record<string, string> = {
  craft_remainder: 'craft_remainder--craft_remaining_item',
  hat_height: 'hat_height-require-customnameplates',
};
/** Settings without a section on the wiki (read by the plugin, not documented) */
const UNDOCUMENTED = new Set(['disable_vanilla_behavior', 'trigger_advancement']);

/** Links each setting to its section on the wiki's settings page, unless it has a link of its own. */
function withSectionDocs(specs: Record<string, PropertySpec>): Record<string, PropertySpec> {
  return Object.fromEntries(
    Object.entries(specs).map(([id, spec]) => {
      const key = id.replace(/^settings\./, '');
      if (spec.docs || key === id || UNDOCUMENTED.has(key)) return [id, spec];
      return [id, { ...spec, docs: ceItemSettingDocs(HEADINGS[key] ?? key) }];
    }),
  );
}

export const CE_SETTINGS_PROPERTIES = properties(
  'settings',
  withDocs(
    CE_DOCS.settings,
    withSectionDocs({
      'settings.tags': {
        field: field.stringList({ suggestions: CE_ITEM_TAGS, placeholder: true }),
        defaultValue: () => ['minecraft:pickaxes'],
      },
      'settings.fuel_time': { field: field.number({ integer: true, min: 1 }), defaultValue: () => 100 },
      'settings.fuel_remainder': { field: field.text({ format: 'resource', placeholder: true }), defaultValue: () => '' },
      'settings.break_power': { field: field.number({ integer: true, min: 0 }), defaultValue: () => 3 },
      'settings.repairable': {
        field: field.choice({
          simple: { field: field.boolean({ defaultHint: true }), matches: (value) => typeof value === 'boolean', newValue: () => false },
          detailed: {
            field: field.object({
              crafting_table: field.boolean({ defaultHint: true }),
              anvil_repair: field.boolean({ defaultHint: true }),
              anvil_combine: field.boolean({ defaultHint: true }),
              grindstone_repair: field.boolean({ defaultHint: true }),
            }),
            matches: isPlainObject,
            newValue: () => ({ anvil_repair: false }),
          },
        }),
        defaultValue: () => false,
      },
      'settings.anvil_repair_item': {
        field: repairEntry('target'),
        defaultValue: () => [{ target: ['#minecraft:pickaxes'], amount: 20 }],
      },
      'settings.drag_repair_item': {
        field: repairEntry('target', { sound: sound() }),
        defaultValue: () => [{ target: ['#minecraft:pickaxes'], amount: 20 }],
      },
      'settings.anvil_repair_material': {
        field: { ...repairEntry('material'), advanced: true },
        defaultValue: () => [{ material: ['minecraft:diamond'], amount: 100 }],
      },
      'settings.drag_repair_material': {
        field: { ...repairEntry('material', { sound: sound() }), advanced: true },
        defaultValue: () => [{ material: ['minecraft:diamond'], amount: 100 }],
      },
      'settings.respect_repairable_component': { field: field.boolean(), defaultValue: () => true },
      'settings.renameable': { field: field.boolean({ defaultHint: true }), defaultValue: () => false },
      'settings.enchantable': { field: field.boolean({ defaultHint: true }), defaultValue: () => false },
      'settings.prevent_break': { field: field.boolean({ defaultHint: false }), defaultValue: () => true },
      'settings.can_place': { field: field.boolean({ defaultHint: false }), defaultValue: () => false },
      'settings.disable_vanilla_behavior': {
        field: field.boolean({ defaultHint: false, advanced: true }),
        defaultValue: () => true,
      },
      'settings.dyeable': { field: field.boolean(), defaultValue: () => true },
      'settings.dye_color': { field: field.text({ placeholder: true }), defaultValue: () => '255,255,255' },
      'settings.firework_color': { field: field.text({ placeholder: true }), defaultValue: () => '255,255,255' },
      'settings.equipment': {
        field: field.object({
          asset_id: field.text({ format: 'resource', placeholder: true }),
          slot: field.select(CE_EQUIPMENT_SLOTS),
          client_bound_model: field.boolean(),
          camera_overlay: field.text({ format: 'resource', placeholder: true }),
          swappable: field.boolean(),
          damage_on_hurt: field.boolean(),
          dispensable: field.boolean(),
          equip_on_interact: field.boolean({ minVersion: '1.21.5' }),
        }),
        defaultValue: () => ({ asset_id: '' }),
      },
      // The shared armor sets: the export writes their `equipments:` entry and fills in `settings.equipment`
      armor: { ...ARMOR_PROPERTY, docs: CE_DOCS.equipment },
      'settings.equipment_lod': {
        field: field.object({
          asset_id: field.text({ format: 'resource', placeholder: true }),
          distance: field.number({ min: 0, help: true }),
        }),
        defaultValue: () => ({ asset_id: '', distance: 32 }),
        aliases: ['level of detail', 'distance'],
      },
      'settings.equipment_potion_effects': {
        field: equipmentPotionEffectList(),
        defaultValue: () => [{ slot: 'head', type: 'minecraft:night_vision' }],
        aliases: ['potion', 'effect'],
      },
      'settings.food': {
        field: field.object({ nutrition: field.number({ integer: true, min: 0, max: 20 }), saturation: field.number({ min: 0, max: 10 }) }),
        defaultValue: () => ({ nutrition: 4, saturation: 2.4 }),
      },
      'settings.consume_replacement': { field: field.text({ format: 'resource', placeholder: true }), defaultValue: () => '' },
      'settings.craft_remainder': { field: craftRemainder(true), defaultValue: () => '' },
      'settings.allowed_projectiles': { field: field.stringList({ placeholder: true }), defaultValue: () => ['minecraft:arrow'] },
      'settings.ingredient_substitute': { field: field.stringList({ placeholder: true }), defaultValue: () => ['minecraft:paper'] },
      'settings.compost_probability': { field: chance(), defaultValue: () => 0.5 },
      'settings.invulnerable': { field: field.multiSelect(CE_DAMAGE_CAUSES), defaultValue: () => ['lava', 'fire'] },
      'settings.keep_on_death_chance': { field: chance(), defaultValue: () => 0.5 },
      'settings.destroy_on_death_chance': { field: chance(), defaultValue: () => 0.5 },
      'settings.drop_display': {
        field: field.choice({
          toggle: { field: field.boolean(), matches: (value) => typeof value === 'boolean', newValue: () => true },
          text: {
            field: field.text({ format: 'minimessage', placeholder: true }),
            matches: (value) => typeof value === 'string',
            newValue: () => '<arg:count>x <name>',
          },
        }),
        defaultValue: () => true,
      },
      'settings.glow_color': { field: field.select(CE_GLOW_COLORS), defaultValue: () => 'white' },
      'settings.hat_height': { field: field.number({ advanced: true }), defaultValue: () => 1.5 },
      'settings.trigger_advancement': { field: field.boolean({ advanced: true }), defaultValue: () => true },
      'settings.projectile': {
        field: field.object({
          display: field.object({
            item: field.text({ format: 'resource', placeholder: true }),
            display_transform: field.select(plainOptions(CE_DISPLAY_TRANSFORMS)),
            billboard: field.select(plainOptions(CE_BILLBOARDS)),
            scale: field.text({ placeholder: true }),
            translation: field.text({ format: 'vector', placeholder: true }),
            rotation: field.text({ placeholder: true, help: true }),
          }),
          sounds: field.object({ throw: sound(), hit_entity: targetSound(), hit_block: targetSound() }),
          ignore_infinity_enchantment: field.boolean({ defaultHint: false }),
          pickupable: field.boolean({ defaultHint: true }),
          remove_on_hit: field.boolean({ defaultHint: false }),
          gravity: field.boolean(),
          velocity: field.number({ min: 0 }),
          damage: field.number({ help: true }),
          pierce_level: field.number({ integer: true, min: 0 }),
        }),
        defaultValue: () => ({ display: { item: '' } }),
        aliases: ['trident', 'throw'],
      },
      // CraftEngine's attribute system (experimental): the test server turns it on for projects that use it
      'settings.attribute_modifiers': {
        field: attributeModifierList(),
        defaultValue: () => [{ type: '', id: '', amount: 1, operation: 'minecraft:add_value', slot: 'mainhand' }],
        docs: CE_DOCS.attributeModifiers,
      },
      'settings.equipment_set_part': {
        field: equipmentSetPartList(),
        defaultValue: () => [{ slots: ['head'], sets: [''] }],
        docs: CE_DOCS.equipmentSets,
      },
    }),
  ),
);
