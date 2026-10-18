import { CUSTOM_BLOCK_TYPES, CUSTOM_EVENTS, DISPLAY_TRANSFORMS, NOTEBLOCK_INSTRUMENTS, POTION_EFFECTS } from '../options';
import { MODEL_TOKEN } from '@resourcepackbuilder/utils';
import { field, properties, whenType } from '../../../form/build';
import { withDocs } from '../../../form/docs';
import { NEXO_DOCS } from './docs';
import { FURNITURE } from './furniture';
import {
  blockLockerField,
  blockSoundsField,
  clickActionsField,
  dropField,
  JAR_ONLY,
  limitedPlacingField,
  potionEffect,
  soundField,
  soundSettingsField,
  storageField,
} from './shared';

const NOTEBLOCK = whenType('NOTEBLOCK');
const STRINGBLOCK = whenType('STRINGBLOCK');
const BLOCK = NEXO_DOCS.customBlock;
const MECHANICS = NEXO_DOCS.mechanics;
/** Message scope of the trident's sounds, which keep their own descriptions */
const TRIDENT_SOUNDS = 'properties.mechanicsTrident.field.fields.sounds.fields';

/** The faces of each directional type: LOG has three axes, FURNACE four sides, DROPPER and BARREL six */
const LOG = whenType('LOG');
const SIDES = whenType('FURNACE', 'DROPPER', 'BARREL');
const UP_DOWN = whenType('DROPPER', 'BARREL');

/** Custom variation of one face of a directional block (assigned by Nexo when empty) */
const variation = (only: ReturnType<typeof whenType>, jarOnly = false) =>
  field.number({ integer: true, min: 1, ...only, ...(jarOnly && JAR_ONLY) });

/** Model of one face of a directional block; without it Nexo rotates the block's own model */
const faceModel = (only: ReturnType<typeof whenType>) => field.text({ format: 'resource', advanced: true, ...only });

/** Item lists that allow or forbid items in a backpack */
const backpackFilter = (jarOnly: boolean) =>
  field.object(
    {
      nexo_items: field.stringList({ placeholder: true }),
      materials: field.stringList({ placeholder: true }),
      tags: field.stringList({ placeholder: true, ...JAR_ONLY }),
    },
    jarOnly ? JAR_ONLY : {},
  );

/** Mechanics without a section of their own (repair) link to the page of all mechanics. */
export const MECHANIC_PROPERTIES = properties(
  'mechanics',
  withDocs(MECHANICS.page, {
    'Mechanics.furniture': FURNITURE,
    'Mechanics.custom_block': {
      conflicts: ['Mechanics.furniture'],
      hint: true,
      keepEmpty: true,
      docs: BLOCK.page,
      field: field.object({
        type: field.select(CUSTOM_BLOCK_TYPES),
        custom_variation: field.number({ integer: true, min: 1, help: true, docs: BLOCK.configuration }),
        model: field.text({ format: 'resource', help: true, docs: BLOCK.configuration }),
        hardness: field.number({ min: 0, step: 0.5, docs: BLOCK.hardness }),
        blast_resistant: field.boolean({ docs: BLOCK.blastResistant }),
        immovable: field.boolean({ ...JAR_ONLY }),
        is_falling: field.boolean({ ...whenType('NOTEBLOCK', 'CHORUSBLOCK'), docs: BLOCK.isFalling }),
        beacon_base_block: field.boolean({ ...NOTEBLOCK, docs: BLOCK.beaconBase }),
        can_ignite: field.boolean({ ...NOTEBLOCK, ...JAR_ONLY }),
        instrument: field.select(NOTEBLOCK_INSTRUMENTS, { allowCustom: true, placeholder: true, ...NOTEBLOCK, ...JAR_ONLY }),
        placeable_on_water: field.boolean({ ...STRINGBLOCK, docs: BLOCK.placeableOnWater }),
        require_supporting: field.boolean({ ...STRINGBLOCK, docs: BLOCK.requiresSupporting }),
        is_tall: field.boolean({ ...STRINGBLOCK, docs: BLOCK.isTall }),
        random_place: field.stringList({ placeholder: true, ...STRINGBLOCK, docs: BLOCK.randomPlace }),
        directional: field.object(
          {
            type: field.select(['LOG', 'FURNACE', 'DROPPER', 'BARREL']),
            y_variation: variation(LOG),
            x_variation: variation(LOG),
            z_variation: variation(LOG),
            north_variation: variation(SIDES, true),
            south_variation: variation(SIDES, true),
            east_variation: variation(SIDES, true),
            west_variation: variation(SIDES, true),
            up_variation: variation(UP_DOWN, true),
            down_variation: variation(UP_DOWN, true),
            y_model: faceModel(LOG),
            x_model: faceModel(LOG),
            z_model: faceModel(LOG),
            north_model: faceModel(SIDES),
            south_model: faceModel(SIDES),
            east_model: faceModel(SIDES),
            west_model: faceModel(SIDES),
            up_model: faceModel(UP_DOWN),
            down_model: faceModel(UP_DOWN),
            parent_block: field.text({ ...JAR_ONLY }),
          },
          { help: true, ...NOTEBLOCK, docs: BLOCK.directional },
        ),
        log_strip: field.object(
          {
            stripped_log: field.text(),
            drop: field.text({ placeholder: true }),
            decrease_axe_durability: field.boolean({ ...JAR_ONLY }),
          },
          { ...NOTEBLOCK, docs: BLOCK.logStrip },
        ),
        sapling: field.object(
          {
            grows_naturally: field.boolean(),
            natural_growth_time: field.number({ integer: true, min: 1, placeholder: true }),
            grows_from_bonemeal: field.boolean(),
            bonemeal_growth_speedup: field.number({ integer: true, min: 0 }),
            grow_sound: soundField(),
            min_light_level: field.number({ integer: true, min: 0, max: 15 }),
            requires_water_source: field.boolean(),
            schematic: field.choice({
              single: { field: field.text({ placeholder: true }), matches: (value) => typeof value === 'string', newValue: () => '' },
              list: {
                field: field.objectList(
                  {
                    schem: field.text({ placeholder: true }),
                    chance: field.number({ min: 0, max: 1, step: 0.05 }),
                  },
                  { titleKey: 'schem', newItem: () => ({ schem: '', chance: 0.5 }) },
                ),
                matches: Array.isArray,
                newValue: () => [{ schem: '', chance: 0.5 }],
              },
            }),
            replace_blocks: field.boolean(),
            copy_biomes: field.boolean(),
            copy_entities: field.boolean(),
          },
          { help: true, ...STRINGBLOCK, docs: BLOCK.sapling },
        ),
        block_sounds: { ...blockSoundsField(), docs: BLOCK.blockSounds },
        drop: { ...dropField(), docs: BLOCK.drop },
        limited_placing: { ...limitedPlacingField(false), docs: BLOCK.limitedPlacing },
        storage: { ...storageField(), ...NOTEBLOCK, docs: BLOCK.storage },
        blocklocker: { ...blockLockerField(), docs: BLOCK.blocklocker },
        clickActions: { ...clickActionsField(), docs: MECHANICS.clickActions },
        variants: field.objectList(
          {
            model: field.text({ format: 'resource', placeholder: true }),
            weight: field.number({ integer: true, min: 1 }),
            x: field.number({ integer: true, min: 0, max: 270, step: 90 }),
            y: field.number({ integer: true, min: 0, max: 270, step: 90 }),
            uvlock: field.boolean(),
            offset: field.text({ format: 'vector', placeholder: true }),
          },
          { titleKey: 'model', newItem: () => ({ model: '', weight: 1 }), ...JAR_ONLY },
        ),
      }),
      defaultValue: () => ({ type: 'NOTEBLOCK', model: MODEL_TOKEN, hardness: 3 }),
    },
    'Mechanics.backpack': {
      hint: true,
      docs: MECHANICS.backpack,
      keepEmpty: true,
      field: field.object({
        rows: field.number({ integer: true, min: 1, max: 6 }),
        title: field.text({ format: 'minimessage', placeholder: true }),
        open_sound: soundField(),
        close_sound: soundField(),
        volume: field.number({ min: 0, step: 0.1, ...JAR_ONLY }),
        pitch: field.number({ min: 0, step: 0.1, ...JAR_ONLY }),
        blacklist: backpackFilter(false),
        whitelist: backpackFilter(true),
      }),
      defaultValue: () => ({ rows: 3, title: '<gray>Backpack' }),
    },
    'Mechanics.commands': {
      docs: MECHANICS.commands,
      keepEmpty: true,
      field: field.object({
        console: field.stringList({ placeholder: true }),
        player: field.stringList({ placeholder: true }),
        opped_player: field.stringList({ placeholder: true }),
        cooldown: field.number({ min: 0 }),
        permission: field.text(),
        one_usage: field.boolean(),
      }),
      defaultValue: () => ({ console: ['say %p% used the item'] }),
    },
    'Mechanics.custom': {
      hint: true,
      docs: MECHANICS.custom,
      field: field.map(
        field.object({
          event: field.select(CUSTOM_EVENTS, { allowCustom: true, docs: MECHANICS.customEvents }),
          one_usage: field.boolean(),
          conditions: field.stringList({ placeholder: true }),
          actions: field.stringList({ placeholder: true }),
          cancel_event: field.boolean({ ...JAR_ONLY }),
          cooldown: field.text({ format: 'duration', placeholder: true, ...JAR_ONLY }),
        }),
        {
          keyPlaceholder: true,
          newValue: () => ({ event: 'CLICK:right:all', one_usage: false, actions: ['[message] <green>Hello <player>!'] }),
        },
      ),
      defaultValue: () => ({
        rightclick: { event: 'CLICK:right:all', one_usage: false, actions: ['[message] <green>Hello <player>!'] },
      }),
    },
    'Mechanics.armor_effects': {
      docs: MECHANICS.armorEffects,
      field: field.object({
        set: field.text({ placeholder: true }),
        reset_on_unequip: field.boolean({ ...JAR_ONLY }),
        // every other key is an effect
        '*': field.map(potionEffect.armor, {
          name: 'Effects',
          keyOptions: POTION_EFFECTS,
          reservedKeys: ['set', 'reset_on_unequip'],
          newValue: () => ({ duration: '10t', amplifier: 0, ambient: true, particles: false, icon: true }),
        }),
      }),
      defaultValue: () => ({ night_vision: { duration: '10t', amplifier: 0, ambient: true, particles: false, icon: true } }),
    },
    'Mechanics.trident': {
      hint: true,
      keepEmpty: true,
      docs: MECHANICS.trident,
      field: field.object({
        damage: field.number({ min: 0, step: 0.5, placeholder: true }),
        display_transform: field.select(DISPLAY_TRANSFORMS),
        rotation: field.text({ placeholder: true }),
        thrown_item: field.text(),
        thrown_item_model: field.text({ format: 'resource' }),
        sounds: field.object(
          {
            throw: soundSettingsField(`${TRIDENT_SOUNDS}.throw.label`),
            hit: soundSettingsField(`${TRIDENT_SOUNDS}.hit.label`),
            hit_ground: soundSettingsField(`${TRIDENT_SOUNDS}.hitGround.label`),
            return: soundSettingsField(`${TRIDENT_SOUNDS}.return.label`),
          },
          { docs: MECHANICS.tridentSounds },
        ),
      }),
      defaultValue: () => ({}),
    },
    'Mechanics.repair': {
      field: field.object({
        ratio: field.number({ min: 0, max: 1, step: 0.05 }),
        fixed_amount: field.number({ integer: true, min: 1 }),
      }),
      defaultValue: () => ({ ratio: 0.25 }),
    },
    'Mechanics.misc': {
      docs: MECHANICS.misc,
      keepEmpty: true,
      field: field.object({
        breaks_from_cactus: field.boolean(),
        disable_vanilla_interactions: field.boolean(),
        can_strip_logs: field.boolean(),
        piglins_ignore_when_equipped: field.boolean(),
        compostable: field.boolean(),
        allow_in_vanilla_recipes: field.boolean(),
        prevent_breaking: field.boolean(),
        prevent_renaming: field.boolean(),
        prevent_item_frames: field.boolean(),
      }),
      defaultValue: () => ({ prevent_renaming: true }),
    },
    'Mechanics.soulbound': {
      docs: MECHANICS.soulbound,
      field: field.object({ lose_chance: field.number({ min: 0, max: 1, step: 0.05 }) }),
      defaultValue: () => ({ lose_chance: 0 }),
    },
    'Mechanics.harvesting': {
      docs: MECHANICS.harvesting,
      field: field.object({
        radius: field.number({ integer: true, min: 0 }),
        height: field.number({ integer: true, min: 0 }),
        cooldown: field.number({ integer: true, min: 0 }),
        lower_item_durability: field.boolean({ ...JAR_ONLY }),
      }),
      defaultValue: () => ({ radius: 2, height: 1, cooldown: 1000 }),
    },
    'Mechanics.smelting': {
      docs: MECHANICS.smelting,
      field: field.object({
        play_sound: field.boolean(),
      }),
      defaultValue: () => ({ play_sound: true }),
    },
    'Mechanics.itemtype': {
      docs: MECHANICS.itemtype,
      field: field.object({ value: field.text({ placeholder: true }) }),
      defaultValue: () => ({ value: '' }),
    },
  }),
);
