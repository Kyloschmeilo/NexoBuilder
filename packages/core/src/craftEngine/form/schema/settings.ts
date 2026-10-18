import { CE_DAMAGE_CAUSES, CE_EQUIPMENT_SLOTS, CE_GLOW_COLORS, CE_ITEM_TAGS } from '../options';
import { armorProperty } from '../../../form/armor';
import { field, properties, type FieldSpecs } from '../../../form/build';
import { attributeModifierList, equipmentSetPartList } from '../../attributes';
import { withDocs } from '../../../form/docs';
import { CE_DOCS } from './docs';

/** One repair entry: which items (ids or `#tags`) it repairs and how much durability it restores */
const repairEntry = (extra: FieldSpecs = {}) =>
  field.objectList(
    {
      target: field.stringList({ placeholder: true, singleAsString: true }),
      amount: field.number({ min: 0 }),
      percent: field.number({ min: 0, max: 1, step: 0.05 }),
      ...extra,
    },
    { newItem: () => ({ target: [''], amount: 20 }) },
  );

const chance = () => field.number({ min: 0, max: 1, step: 0.05 });

/**
 * The item settings (`settings`): mechanics CraftEngine implements itself. Decision: the `*_repair_material` keys of
 * the wiki are left out, the plugin source only reads `anvil_repair_item` and `drag_repair_item`.
 */
export const CE_SETTINGS_PROPERTIES = properties(
  'settings',
  withDocs(CE_DOCS.settings, {
    'settings.tags': {
      field: field.stringList({ suggestions: CE_ITEM_TAGS, placeholder: true }),
      defaultValue: () => ['minecraft:pickaxes'],
    },
    'settings.fuel_time': { field: field.number({ integer: true, min: 1 }), defaultValue: () => 100 },
    'settings.fuel_remainder': { field: field.text({ format: 'resource', placeholder: true }), defaultValue: () => '' },
    'settings.break_power': { field: field.number({ integer: true, min: 0 }), defaultValue: () => 3 },
    'settings.repairable': { field: field.boolean({ defaultHint: true }), defaultValue: () => false },
    'settings.anvil_repair_item': {
      field: repairEntry(),
      defaultValue: () => [{ target: ['#minecraft:pickaxes'], amount: 20 }],
    },
    'settings.drag_repair_item': {
      field: repairEntry({ sound: field.text({ placeholder: true }) }),
      defaultValue: () => [{ target: ['#minecraft:pickaxes'], amount: 20 }],
    },
    'settings.respect_repairable_component': { field: field.boolean(), defaultValue: () => true },
    'settings.renameable': { field: field.boolean({ defaultHint: true }), defaultValue: () => false },
    'settings.enchantable': { field: field.boolean({ defaultHint: true }), defaultValue: () => false },
    'settings.prevent_break': { field: field.boolean({ defaultHint: false }), defaultValue: () => true },
    'settings.can_place': { field: field.boolean({ defaultHint: false }), defaultValue: () => false },
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
    armor: armorProperty({ page: CE_DOCS.equipment, options: CE_DOCS.equipmentComponent, trim: CE_DOCS.equipmentTrim }),
    'settings.consume_replacement': { field: field.text({ format: 'resource', placeholder: true }), defaultValue: () => '' },
    'settings.craft_remainder': { field: field.text({ format: 'resource', placeholder: true }), defaultValue: () => '' },
    'settings.allowed_projectiles': { field: field.stringList({ placeholder: true }), defaultValue: () => ['minecraft:arrow'] },
    'settings.ingredient_substitute': { field: field.stringList({ placeholder: true }), defaultValue: () => ['minecraft:paper'] },
    'settings.compost_probability': { field: chance(), defaultValue: () => 0.5 },
    'settings.invulnerable': { field: field.multiSelect(CE_DAMAGE_CAUSES), defaultValue: () => ['lava', 'fire'] },
    'settings.keep_on_death_chance': { field: chance(), defaultValue: () => 0.5 },
    'settings.destroy_on_death_chance': { field: chance(), defaultValue: () => 0.5 },
    'settings.glow_color': { field: field.select(CE_GLOW_COLORS), defaultValue: () => 'white' },
    'settings.projectile': { field: field.yaml(), defaultValue: () => ({ display: { item: '' } }) },
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
);
