import { isPlainObject } from '@resourcepackbuilder/utils';
import { CE_BLOCK_SOUNDS, CE_BLOCK_TAGS, CE_INSTRUMENTS, CE_PUSH_REACTIONS } from '../options';
import { field, properties, type FieldSpec, type PropertySpec } from '../../../form/build';
import { plainOptions } from '../../../form/options';
import { CE_SETTINGS_TEMPLATE_OPTIONS } from '../../templates';
import { CE_BILLBOARDS, CE_DISPLAY_TRANSFORMS } from '../../furniture';
import { withDocs } from '../../../form/docs';
import { CE_DOCS } from './docs';

/** The section of a setting on the block settings page (its heading is the key). */
const section = (key: string) => `${CE_DOCS.blockSettings}#${key}`;

const SOUNDS_SCOPE = 'properties.blockSettingsSounds.field';

/**
 * One sound of the block: a sound event id, or `{ id, volume, pitch }` (BlockSounds/SoundData, where volume and pitch
 * default to the vanilla values of the sound's kind).
 */
const sound = (key: string): FieldSpec =>
  field.choice(
    {
      id: {
        field: field.text({ suggestions: CE_BLOCK_SOUNDS, placeholder: true }),
        matches: (value) => typeof value === 'string',
        newValue: () => '',
      },
      detailed: {
        field: field.object({
          id: field.text({ suggestions: CE_BLOCK_SOUNDS, placeholder: true }),
          volume: field.number({ min: 0, step: 0.05 }),
          pitch: field.number({ min: 0, step: 0.05 }),
        }),
        matches: (value) => isPlainObject(value),
        newValue: () => ({ id: '', volume: 1, pitch: 1 }),
      },
    },
    { scope: `${SOUNDS_SCOPE}.sound`, label: `${SOUNDS_SCOPE}.fields.${key}.label` },
  );
const lightLevel = () => field.number({ integer: true, min: 0, max: 15 });
const percent = () => field.number({ integer: true, min: 0, max: 100 });

/**
 * The block settings (`block.settings`, stable and unstable keys of the wiki, checked against the plugin's
 * BlockSettingsModifiers). Shown in the Block section of the model tab, only while the item is a block, so adding one
 * never turns an item into a block. The block's drops (`block.loot`) are on the Loot tab (schema/loot.ts).
 * `template` and `arguments` take the settings from templates (the jar's or the project's); the settings set next to
 * them are merged over the template's, as in the jar's blocks.
 * Not offered: `item` (the export sets it to the item itself), `client_bound_tags` (read for vanilla blocks only) and
 * `name` (read by the plugin but not documented).
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
  'block.settings.hardness': {
    field: field.number({ min: 0, step: 0.1 }),
    defaultValue: () => 2,
    docs: section('hardness'),
    common: true,
    aliases: ['mining time', 'break time'],
  },
  'block.settings.resistance': {
    field: field.number({ min: 0, step: 0.1 }),
    defaultValue: () => 2,
    docs: section('resistance'),
    common: true,
    aliases: ['explosion', 'blast resistance'],
  },
  'block.settings.tags': {
    field: field.stringList({ suggestions: CE_BLOCK_TAGS, placeholder: true }),
    defaultValue: () => ['minecraft:mineable/pickaxe'],
    docs: section('tags'),
    common: true,
    aliases: ['mineable', 'tool'],
  },
  'block.settings.sounds': {
    field: field.object({ break: sound('break'), step: sound('step'), place: sound('place'), hit: sound('hit'), fall: sound('fall') }),
    defaultValue: () => ({
      break: 'minecraft:block.stone.break',
      step: 'minecraft:block.stone.step',
      place: 'minecraft:block.stone.place',
      hit: 'minecraft:block.stone.hit',
      fall: 'minecraft:block.stone.fall',
    }),
    docs: section('sounds'),
    common: true,
    aliases: ['volume', 'pitch'],
  },
  'block.settings.correct_tools': {
    field: field.stringList({ placeholder: true }),
    defaultValue: () => ['#minecraft:pickaxes'],
    docs: section('correct_tools'),
  },
  'block.settings.require_correct_tools': {
    field: field.boolean({ defaultHint: false }),
    defaultValue: () => true,
    docs: section('require_correct_tools'),
  },
  'block.settings.respect_tool_component': {
    field: field.boolean({ defaultHint: false }),
    defaultValue: () => true,
    docs: section('respect_tool_component'),
    aliases: ['correct_for_drops', 'minecraft:tool'],
  },
  'block.settings.required_break_power': {
    field: field.number({ integer: true, min: 0 }),
    defaultValue: () => 1,
    docs: section('required_break_power'),
    aliases: ['tool tier', 'mining level'],
  },
  'block.settings.incorrect_tool_dig_speed': {
    field: field.number({ min: 0, max: 1, step: 0.05 }),
    defaultValue: () => 0.3,
    docs: section('incorrect_tool_dig_speed'),
  },
  'block.settings.luminance': {
    field: lightLevel(),
    defaultValue: () => 15,
    docs: section('luminance'),
    aliases: ['light level', 'glow'],
  },
  'block.settings.map_color': {
    field: field.number({ integer: true, min: 0, max: 63 }),
    defaultValue: () => 11,
    docs: section('map_color'),
  },
  'block.settings.push_reaction': {
    field: field.select(CE_PUSH_REACTIONS),
    defaultValue: () => 'PUSH_PULL',
    docs: section('push_reaction'),
    aliases: ['piston'],
  },
  'block.settings.instrument': {
    field: field.select(CE_INSTRUMENTS),
    defaultValue: () => 'basedrum',
    docs: section('instrument'),
    aliases: ['note block'],
  },
  'block.settings.fluid_state': {
    field: field.select(['water', 'empty']),
    defaultValue: () => 'water',
    docs: section('fluid_state'),
    aliases: ['waterlogged', 'water'],
  },
  'block.settings.burnable': {
    field: field.boolean({ defaultHint: false }),
    defaultValue: () => true,
    docs: section('burnable'),
    aliases: ['fire', 'flammable'],
  },
  'block.settings.burn_chance': { field: percent(), defaultValue: () => 5, docs: section('burn_chance'), aliases: ['fire'] },
  'block.settings.fire_spread_chance': { field: percent(), defaultValue: () => 20, docs: section('fire_spread_chance'), aliases: ['fire'] },
  'block.settings.replaceable': { field: field.boolean({ defaultHint: false }), defaultValue: () => true, docs: section('replaceable') },
  'block.settings.is_redstone_conductor': { field: field.boolean(), defaultValue: () => true, docs: section('is_redstone_conductor') },
  'block.settings.is_suffocating': { field: field.boolean(), defaultValue: () => true, docs: section('is_suffocating') },
  'block.settings.is_view_blocking': { field: field.boolean(), defaultValue: () => true, docs: section('is_view_blocking') },
  // Read by the plugin (BlockSettingsModifiers); the wiki has no section for it, so it links to the page
  'block.settings.is_randomly_ticking': {
    field: field.boolean({ defaultHint: false }),
    defaultValue: () => true,
    aliases: ['random tick'],
  },
  'block.settings.can_occlude': { field: field.boolean(), defaultValue: () => false, docs: section('can_occlude') },
  'block.settings.block_light': {
    field: lightLevel(),
    defaultValue: () => 0,
    docs: section('block_light'),
    aliases: ['light_block', 'light_dampening'],
  },
  'block.settings.propagate_skylight': { field: field.boolean(), defaultValue: () => true, docs: section('propagate_skylight') },
  // Read by CraftEngine 26.9 (BlockSettingsModifiers) but not on the wiki: linked to the page, tucked away
  'block.settings.use_shape_for_light_occlusion': {
    field: field.boolean({ advanced: true, help: true }),
    defaultValue: () => true,
  },
  'block.settings.friction': {
    field: field.number({ min: 0, step: 0.01 }),
    defaultValue: () => 0.98,
    docs: section('friction'),
    aliases: ['slippery', 'ice'],
  },
  'block.settings.speed_factor': { field: field.number({ min: 0, step: 0.1 }), defaultValue: () => 1, docs: section('speed_factor') },
  'block.settings.jump_factor': { field: field.number({ min: 0, step: 0.1 }), defaultValue: () => 1, docs: section('jump_factor') },
  'block.settings.bounce_restitution': {
    field: field.number({ min: 0, step: 0.05 }),
    defaultValue: () => 0.5,
    docs: section('bounce_restitution'),
    aliases: ['bounce', 'slime'],
  },
  'block.settings.support_shape': {
    field: field.text({ format: 'resource', placeholder: true }),
    defaultValue: () => 'minecraft:stone',
    docs: section('support_shape'),
  },
  // Read by CraftEngine 26.9 (BlockSettingsModifiers) but not on the wiki: linked to the page, tucked away
  'block.settings.block_raytrace': { field: field.boolean({ advanced: true, help: true }), defaultValue: () => true },
  'block.settings.destroy_stages': {
    field: field.object(
      {
        items: field.stringList({ placeholder: true, help: true }),
        translation: field.text({ format: 'vector', placeholder: true }),
        position: field.text({ format: 'vector', placeholder: true }),
        scale: field.text({ placeholder: true }),
        yaw: field.number({ step: 1 }),
        pitch: field.number({ step: 1 }),
        rotation: field.text({ placeholder: true, help: true }),
        display_transform: field.select(plainOptions([...CE_DISPLAY_TRANSFORMS])),
        billboard: field.select(plainOptions([...CE_BILLBOARDS])),
        view_range: field.number({ min: 0, step: 0.1 }),
        brightness: field.object({ block_light: lightLevel(), sky_light: lightLevel() }),
      },
      { advanced: true },
    ),
    defaultValue: () => ({ items: ['minecraft:destroy_stage_0'] }),
    docs: section('destroy_stages'),
    aliases: ['crack', 'breaking animation', 'mining animation'],
  },
};

export const CE_BLOCK_SETTINGS_PROPERTIES = properties('blockSettings', withDocs(CE_DOCS.blockSettings, SETTINGS));
