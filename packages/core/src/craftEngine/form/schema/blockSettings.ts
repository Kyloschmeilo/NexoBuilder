import { CE_BLOCK_SOUNDS, CE_BLOCK_TAGS, CE_INSTRUMENTS, CE_PUSH_REACTIONS } from '../options';
import { field, properties, type PropertySpec } from '../../../form/build';
import { CE_SETTINGS_TEMPLATE_OPTIONS } from '../../templates';
import { withDocs } from '../../../form/docs';
import { CE_DOCS } from './docs';

const sound = () => field.text({ suggestions: CE_BLOCK_SOUNDS, placeholder: true });
const lightLevel = () => field.number({ integer: true, min: 0, max: 15 });
const percent = () => field.number({ integer: true, min: 0, max: 100 });

/**
 * The block settings (`block.settings`, stable and unstable keys of the wiki, checked against the plugin's
 * BlockSettingsModifiers). Shown in the Block section of the model tab, only while the item is a block, so adding one
 * never turns an item into a block. The block's drops (`block.loot`) are on the Loot tab (schema/loot.ts).
 * `template` and `arguments` take the settings from templates (the jar's or the project's); the settings set next to
 * them are merged over the template's, as in the jar's blocks.
 */
const SETTINGS: Record<string, PropertySpec> = {
  'block.settings.template': {
    field: field.stringList({ suggestions: CE_SETTINGS_TEMPLATE_OPTIONS, dynamicSuggestions: 'templates', placeholder: true }),
    defaultValue: () => ['default:settings/solid_1x1x1'],
    hint: true,
    docs: CE_DOCS.templates,
  },
  'block.settings.arguments': {
    field: field.map(field.text({ placeholder: true }), { keyPlaceholder: true, newValue: () => '' }),
    defaultValue: () => ({ block_type: 'stone' }),
    docs: CE_DOCS.templates,
  },
  'block.settings.hardness': { field: field.number({ min: 0, step: 0.1 }), defaultValue: () => 2 },
  'block.settings.resistance': { field: field.number({ min: 0, step: 0.1 }), defaultValue: () => 2 },
  'block.settings.tags': {
    field: field.stringList({ suggestions: CE_BLOCK_TAGS, placeholder: true }),
    defaultValue: () => ['minecraft:mineable/pickaxe'],
  },
  'block.settings.sounds': {
    field: field.object({ break: sound(), step: sound(), place: sound(), hit: sound(), fall: sound() }),
    defaultValue: () => ({
      break: 'minecraft:block.stone.break',
      step: 'minecraft:block.stone.step',
      place: 'minecraft:block.stone.place',
      hit: 'minecraft:block.stone.hit',
      fall: 'minecraft:block.stone.fall',
    }),
  },
  'block.settings.correct_tools': {
    field: field.stringList({ placeholder: true }),
    defaultValue: () => ['#minecraft:pickaxes'],
  },
  'block.settings.require_correct_tools': { field: field.boolean({ defaultHint: false }), defaultValue: () => true },
  'block.settings.required_break_power': { field: field.number({ integer: true, min: 0 }), defaultValue: () => 1 },
  'block.settings.incorrect_tool_dig_speed': { field: field.number({ min: 0, max: 1, step: 0.05 }), defaultValue: () => 0.3 },
  'block.settings.luminance': { field: lightLevel(), defaultValue: () => 15 },
  'block.settings.map_color': { field: field.number({ integer: true, min: 0, max: 63 }), defaultValue: () => 11 },
  'block.settings.push_reaction': { field: field.select(CE_PUSH_REACTIONS), defaultValue: () => 'PUSH_PULL' },
  'block.settings.instrument': { field: field.select(CE_INSTRUMENTS), defaultValue: () => 'basedrum' },
  'block.settings.burnable': { field: field.boolean({ defaultHint: false }), defaultValue: () => true },
  'block.settings.burn_chance': { field: percent(), defaultValue: () => 5 },
  'block.settings.fire_spread_chance': { field: percent(), defaultValue: () => 20 },
  'block.settings.replaceable': { field: field.boolean({ defaultHint: false }), defaultValue: () => true },
  'block.settings.is_redstone_conductor': { field: field.boolean(), defaultValue: () => true },
  'block.settings.is_suffocating': { field: field.boolean(), defaultValue: () => true },
  'block.settings.is_view_blocking': { field: field.boolean(), defaultValue: () => true },
  'block.settings.is_randomly_ticking': { field: field.boolean({ defaultHint: false }), defaultValue: () => true },
  'block.settings.can_occlude': { field: field.boolean(), defaultValue: () => false },
  'block.settings.block_light': { field: lightLevel(), defaultValue: () => 0 },
  'block.settings.propagate_skylight': { field: field.boolean(), defaultValue: () => true },
  'block.settings.friction': { field: field.number({ min: 0, step: 0.01 }), defaultValue: () => 0.98 },
  'block.settings.speed_factor': { field: field.number({ min: 0, step: 0.1 }), defaultValue: () => 1 },
  'block.settings.jump_factor': { field: field.number({ min: 0, step: 0.1 }), defaultValue: () => 1 },
  'block.settings.bounce_restitution': { field: field.number({ min: 0, step: 0.05 }), defaultValue: () => 0.5 },
  'block.settings.support_shape': { field: field.text({ format: 'resource', placeholder: true }), defaultValue: () => 'minecraft:stone' },
};

export const CE_BLOCK_SETTINGS_PROPERTIES = properties('blockSettings', withDocs(CE_DOCS.blockSettings, SETTINGS));
