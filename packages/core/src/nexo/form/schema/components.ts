import { CONSUME_ANIMATIONS, DAMAGE_TYPE_TAGS, EQUIPPABLE_SLOTS, MATERIALS, SWING_ANIMATIONS, VANILLA_COMPONENTS } from '../options';
import { field, properties } from '../../../form/build';
import { withDocs } from '../../../form/docs';
import { NEXO_DOCS } from './docs';
import { plainOptions } from '../../../form/options';
import { consumeEffectsField, soundField } from './shared';

/** Swing, attack and interact animation */
const animationField = () =>
  field.object({
    type: field.select(SWING_ANIMATIONS, { allowCustom: true }),
    duration: field.text({ format: 'duration', placeholder: true }),
  });

const blockListField = () => field.object({ blocks: field.stringList({ placeholder: true }) });

/** Every component links to the components page; those with a page or section of their own link there. */
export const COMPONENT_PROPERTIES = properties(
  'components',
  withDocs(NEXO_DOCS.components, {
    'Components.max_stack_size': { field: field.number({ integer: true, min: 1, max: 99 }), defaultValue: () => 1 },
    'Components.max_damage': { field: field.number({ integer: true, min: 1 }), defaultValue: () => 250 },
    'Components.enchantment_glint_override': { field: field.boolean(), defaultValue: () => true },
    'Components.fire_resistant': { field: field.boolean(), defaultValue: () => true },
    'Components.hide_tooltip': { field: field.boolean(), defaultValue: () => true },
    'Components.tooltip_display': {
      field: field.stringList({ suggestions: VANILLA_COMPONENTS, placeholder: true }),
      defaultValue: () => ['minecraft:attribute_modifiers'],
      minVersion: '1.21.5',
    },
    'Components.food': {
      field: field.object({
        nutrition: field.number({ integer: true, min: 0 }),
        saturation: field.number({ min: 0, step: 0.1 }),
        can_always_eat: field.boolean({ defaultHint: false }),
      }),
      defaultValue: () => ({ nutrition: 4, saturation: 2.4 }),
    },
    'Components.consumable': {
      field: field.object({
        consume_duration: field.text({ format: 'duration', placeholder: true }),
        animation: field.select(CONSUME_ANIMATIONS, { allowCustom: true, placeholder: true }),
        sound: soundField({ help: true }),
        consume_particles: field.boolean({ defaultHint: true }),
        effects: consumeEffectsField('properties.componentsConsumable.field.fields.effects.label'),
      }),
      defaultValue: () => ({ consume_duration: '1.6s', animation: 'EAT' }),
    },
    'Components.use_remainder': {
      field: field.object({
        nexo_item: field.text({ placeholder: true }),
        minecraft_type: field.select(MATERIALS, { allowCustom: true }),
      }),
      defaultValue: () => ({ minecraft_type: 'GLASS_BOTTLE' }),
    },
    'Components.use_cooldown': {
      field: field.object({
        duration: field.text({ format: 'duration', placeholder: true }),
        group: field.text({ format: 'resource', placeholder: true }),
      }),
      defaultValue: () => ({ duration: '1s' }),
    },
    'Components.tool': {
      field: field.object({
        default_mining_speed: field.number({ min: 0, step: 0.1, placeholder: true }),
        damage_per_block: field.number({ integer: true, min: 0, placeholder: true }),
        rules: field.objectList(
          {
            speed: field.number({ min: 0, step: 0.5 }),
            correct_for_drops: field.boolean(),
            materials: field.stringList({ placeholder: true }),
            tags: field.stringList({
              placeholder: true,
              suggestions: plainOptions([
                'minecraft:mineable/pickaxe',
                'minecraft:mineable/axe',
                'minecraft:mineable/shovel',
                'minecraft:mineable/hoe',
                'minecraft:needs_stone_tool',
                'minecraft:needs_iron_tool',
                'minecraft:needs_diamond_tool',
              ]),
            }),
          },
          { newItem: () => ({ speed: 6.0, correct_for_drops: true, tags: ['minecraft:mineable/pickaxe'] }) },
        ),
      }),
      defaultValue: () => ({
        default_mining_speed: 1.0,
        damage_per_block: 1,
        rules: [{ speed: 6.0, correct_for_drops: true, tags: ['minecraft:mineable/pickaxe'] }],
      }),
    },
    'Components.weapon': {
      field: field.object({
        damage_per_attack: field.number({ integer: true, min: 0 }),
        disable_blocking: field.number({ min: 0, step: 0.5 }),
      }),
      defaultValue: () => ({ damage_per_attack: 1 }),
      minVersion: '1.21.5',
    },
    'Components.equippable': {
      hint: true,
      docs: NEXO_DOCS.armor.equippable,
      field: field.object({
        slot: field.select(EQUIPPABLE_SLOTS),
        asset_id: field.text({ format: 'resource', placeholder: true }),
        camera_overlay: field.text({ format: 'resource', placeholder: true }),
        equip_sound: soundField({ help: true }),
        allowed_entity_types: field.stringList({ placeholder: true }),
        dispensable: field.boolean(),
        swappable: field.boolean(),
        damage_on_hurt: field.boolean(),
      }),
      defaultValue: () => ({ slot: 'HEAD' }),
    },
    'Components.glider': { field: field.boolean(), defaultValue: () => true, docs: NEXO_DOCS.armor.elytras },
    'Components.damage_resistant': { field: field.select(DAMAGE_TYPE_TAGS, { allowCustom: true }), defaultValue: () => 'is_fire' },
    'Components.enchantable': {
      field: field.number({ integer: true, min: 0 }),
      defaultValue: () => 15,
      docs: NEXO_DOCS.items.disableEnchanting,
    },
    'Components.repairable': {
      field: field.stringList({ placeholder: true, singleAsString: true }),
      defaultValue: () => ['minecraft:diamond'],
    },
    'Components.death_protection': {
      field: field.object({ death_effects: consumeEffectsField('properties.componentsDeathProtection.field.fields.deathEffects.label') }),
      defaultValue: () => ({}),
      keepEmpty: true,
    },
    'Components.jukebox_playable': {
      docs: NEXO_DOCS.musicDiscs,
      field: field.object({ song_key: field.text({ format: 'resource', placeholder: true }) }),
      defaultValue: () => ({ song_key: '' }),
    },
    'Components.tooltip_style': { field: field.text({ format: 'resource', placeholder: true }), defaultValue: () => '' },
    'Components.break_sound': { field: soundField(), defaultValue: () => 'entity.item.break', minVersion: '1.21.5' },
    'Components.can_place_on': { field: blockListField(), defaultValue: () => ({ blocks: ['stone'] }), minVersion: '1.21.5' },
    'Components.can_break': { field: blockListField(), defaultValue: () => ({ blocks: ['stone'] }), minVersion: '1.21.5' },
    'Components.profile': {
      field: field.object({
        name: field.text(),
        uuid: field.text(),
        properties: field.object({
          name: field.text({ placeholder: true }),
          value: field.text(),
          signature: field.text(),
        }),
      }),
      defaultValue: () => ({ name: '' }),
    },
    'Components.painting_variant': {
      docs: NEXO_DOCS.paintings.item,
      field: field.text({ format: 'resource', placeholder: true }),
      defaultValue: () => '',
      minVersion: '1.21.7',
    },
    'Components.custom_model_data': { field: field.yaml({ placeholder: true }), defaultValue: () => ({ floats: [1.0] }) },
    'Components.custom_data': { field: field.yaml({ placeholder: true }), defaultValue: () => ({ 'myplugin:value': '' }) },
    'Components.unset_components': {
      field: field.stringList({ suggestions: VANILLA_COMPONENTS, placeholder: true }),
      defaultValue: () => ['minecraft:tool'],
    },
    'Components.blocks_attacks': {
      field: field.yaml({ placeholder: true }),
      defaultValue: () => ({
        block_delay: '0.25s',
        disable_cooldown_scale: 1.0,
        block_sound: 'item.shield.block',
        disable_sound: 'item.shield.break',
        damage_reductions: [{ base: 0.0, factor: 1.0, horizontal_blocking: 90.0 }],
      }),
      minVersion: '1.21.5',
    },
    'Components.attack_range': {
      field: field.object({
        reach: field.text({ format: 'range', placeholder: true }),
        hitbox_margin: field.number({ min: 0, step: 0.1 }),
        mob_factor: field.number({ min: 0, step: 0.1 }),
      }),
      defaultValue: () => ({ reach: '0..3', hitbox_margin: 0.3 }),
      minVersion: '1.21.11',
    },
    'Components.piercing_weapon': {
      field: field.object({
        sound: soundField(),
        hit_sound: soundField(),
        dismounts: field.boolean(),
        deals_knockback: field.boolean(),
      }),
      defaultValue: () => ({ deals_knockback: true }),
      minVersion: '1.21.11',
    },
    'Components.kinetic_weapon': {
      field: field.yaml({ placeholder: true }),
      defaultValue: () => ({ contact_cooldown: '10t', delay: '0t', damage_multiplier: 1.0 }),
      minVersion: '1.21.11',
    },
    'Components.swing_animation': {
      field: animationField(),
      defaultValue: () => ({ type: 'WHACK', duration: '6t' }),
      minVersion: '1.21.11',
      maxVersion: '26.2',
    },
    'Components.attack_animation': { field: animationField(), defaultValue: () => ({ type: 'WHACK', duration: '6t' }), minVersion: '26.3' },
    'Components.interact_animation': {
      field: animationField(),
      defaultValue: () => ({ type: 'WHACK', duration: '6t' }),
      minVersion: '26.3',
    },
    'Components.use_effects': {
      field: field.object({
        can_sprint: field.boolean(),
        interact_vibrations: field.boolean(),
        speed_multiplier: field.number({ min: 0, max: 1, step: 0.05 }),
      }),
      defaultValue: () => ({ speed_multiplier: 0.2 }),
      minVersion: '1.21.11',
    },
    'Components.damage_type': { field: field.text({ placeholder: true }), defaultValue: () => '', minVersion: '1.21.11' },
    'Components.minimum_attack_charge': {
      field: field.number({ min: 0, max: 1, step: 0.05 }),
      defaultValue: () => 1.0,
      minVersion: '1.21.11',
    },
    'Components.compostable': {
      field: field.object({ layers: field.number({ integer: true, min: 1, max: 7 }) }),
      defaultValue: () => ({ layers: 1 }),
      minVersion: '26.3',
    },
    'Components.cooking_fuel': {
      field: field.object({
        burn_time: field.text({ format: 'duration', placeholder: true }),
        speed_multiplier: field.number({ min: 0, step: 0.1 }),
      }),
      defaultValue: () => ({ burn_time: '10s' }),
      minVersion: '26.3',
    },
    'Components.brewing_fuel': {
      field: field.object({
        uses: field.number({ integer: true, min: 1 }),
        speed_multiplier: field.number({ min: 0, step: 0.1 }),
      }),
      defaultValue: () => ({ uses: 1 }),
      minVersion: '26.3',
    },
  }),
);
