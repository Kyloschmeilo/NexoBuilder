/** Field specs used by several properties. Most carry their own message scope under `shared.*`. */
import {
  BLOCKLOCKER_TYPES,
  MATERIALS,
  POTION_EFFECTS,
  SOUND_SUGGESTIONS,
  STORAGE_TYPES,
  TOOL_TIERS,
  TOOL_TYPES,
  TRACKING_ROTATIONS,
} from '../options';
import { RESERVED_STATE_KEYS } from '../../../project/variants';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { field, whenType } from '../../../form/build';

/**
 * Options of a field Nexo 1.30 reads although its docs do not list it yet: tucked away as advanced, with a help text
 * (at `<scope>.help`) that says which plugin version reads it.
 */
export const JAR_ONLY = { advanced: true, help: true } as const;

/** Sound key with suggestions; all sound fields share one placeholder. */
export const soundField = (options: { help?: boolean } = {}) =>
  field.text({ suggestions: SOUND_SUGGESTIONS, placeholder: 'shared.sound.placeholder', ...options });

/** Volume and pitch of a sound (both default to what Minecraft uses) */
const soundVolumePitch = {
  volume: field.number({ min: 0, step: 0.1, placeholder: 'shared.soundSettings.volumePlaceholder' }),
  pitch: field.number({ min: 0, step: 0.1, placeholder: 'shared.soundSettings.pitchPlaceholder' }),
};

/**
 * A sound that is either a sound key or a section with the key, volume and pitch (`{sound, volume, pitch}`), like the
 * sounds of a custom trident. `label` is the message key of the field's description.
 */
export const soundSettingsField = (label?: string) =>
  field.choice(
    {
      key: { field: soundField(), matches: (value) => typeof value === 'string', newValue: () => '' },
      settings: {
        field: field.object({ sound: soundField(), ...soundVolumePitch }),
        matches: isPlainObject,
        newValue: () => ({ sound: '' }),
      },
    },
    { scope: 'shared.soundSettings', ...(label && { label }) },
  );

/** Settings of one potion effect (the value of an effect map keyed by effect) */
export const potionEffect = {
  consumable: field.object(
    {
      duration: field.text({ format: 'duration', placeholder: true }),
      amplifier: field.number({ integer: true, min: 0, max: 255 }),
      probability: field.number({ min: 0, max: 1, step: 0.05, placeholder: true }),
      ambient: field.boolean(),
      show_icon: field.boolean(),
      show_particles: field.boolean(),
    },
    { scope: 'shared.potionEffect.consumable' },
  ),
  armor: field.object(
    {
      duration: field.text({ format: 'duration', placeholder: true }),
      amplifier: field.number({ integer: true, min: 0, max: 255 }),
      ambient: field.boolean(),
      particles: field.boolean(),
      icon: field.boolean(),
      requires_full_set: field.boolean(),
    },
    { scope: 'shared.potionEffect.armor' },
  ),
};

/** Consume effects (consumable, death protection); `label` is the message key of the field itself. */
export const consumeEffectsField = (label: string) =>
  field.object(
    {
      APPLY_EFFECTS: field.map(potionEffect.consumable, {
        keyOptions: POTION_EFFECTS,
        newValue: () => ({ duration: '10s', amplifier: 0 }),
      }),
      REMOVE_EFFECTS: field.stringList({ suggestions: POTION_EFFECTS, placeholder: true }),
      CLEAR_ALL_EFFECTS: field.presence(),
      TELEPORT_RANDOMLY: field.object({ diameter: field.number({ min: 0, step: 1, placeholder: true }) }),
      PLAY_SOUND: field.object({ sound: soundField() }),
    },
    { scope: 'shared.consumeEffects', label },
  );

export const dropField = () =>
  field.object(
    {
      silktouch: field.boolean(),
      fortune: field.boolean(),
      minimal_type: field.select(TOOL_TIERS, { allowCustom: true }),
      best_tool: field.select(TOOL_TYPES, { allowCustom: true }),
      loots: field.objectList(
        {
          nexo_item: field.text({ placeholder: true }),
          minecraft_type: field.select(MATERIALS, { allowCustom: true }),
          crucible_item: field.text({ advanced: true }),
          minecraft_item: field.text({ placeholder: true, ...JAR_ONLY }),
          mmoitems_type: field.text({ ...JAR_ONLY }),
          mmoitems_id: field.text({ ...JAR_ONLY }),
          amount: field.text({ format: 'range', placeholder: true }),
          min_amount: field.number({ integer: true, min: 0, ...JAR_ONLY }),
          max_amount: field.number({ integer: true, min: 0, ...JAR_ONLY }),
          probability: field.number({ min: 0, max: 1, step: 0.05 }),
          in_explosion: field.boolean(),
        },
        { titleKey: 'nexo_item', newItem: () => ({ nexo_item: '', probability: 1.0 }) },
      ),
    },
    { scope: 'shared.drop', help: true },
  );

/** The long form of one block sound (`place: {sound, volume, pitch}`), next to the short `place_sound` form */
const blockSoundEvent = (event: string) =>
  field.object(
    { sound: soundField(), ...soundVolumePitch },
    { scope: 'shared.blockSoundEvent', label: `shared.blockSounds.fields.${event}.label`, advanced: true },
  );

export const blockSoundsField = () =>
  field.object(
    {
      place_sound: soundField(),
      break_sound: soundField(),
      hit_sound: soundField(),
      step_sound: soundField(),
      fall_sound: soundField(),
      place: blockSoundEvent('place'),
      break: blockSoundEvent('break'),
      hit: blockSoundEvent('hit'),
      step: blockSoundEvent('step'),
      fall: blockSoundEvent('fall'),
    },
    { scope: 'shared.blockSounds' },
  );

export const storageField = () =>
  field.object(
    {
      type: field.select(STORAGE_TYPES),
      rows: field.number({ integer: true, min: 1, max: 6, placeholder: true }),
      title: field.text({ format: 'minimessage', placeholder: true }),
      open_sound: soundField(),
      close_sound: soundField(),
      volume: field.number({ min: 0, step: 0.1, ...JAR_ONLY }),
      pitch: field.number({ min: 0, step: 0.1, ...JAR_ONLY }),
      open_animation: field.text({ ...JAR_ONLY }),
      close_animation: field.text({ ...JAR_ONLY }),
    },
    { scope: 'shared.storage' },
  );

export const limitedPlacingField = (withRadius: boolean) =>
  field.object(
    {
      floor: field.boolean({ defaultHint: true }),
      wall: field.boolean({ defaultHint: true }),
      roof: field.boolean({ defaultHint: true }),
      type: field.select(['ALLOW', 'DENY']),
      block_types: field.stringList({ placeholder: true }),
      block_tags: field.stringList({ placeholder: true }),
      nexo_blocks: field.stringList({ placeholder: true }),
      ...(withRadius && {
        radius_limitation: field.object({
          radius: field.number({ integer: true, min: 1 }),
          amount: field.number({ integer: true, min: 1 }),
        }),
      }),
    },
    { scope: 'shared.limitedPlacing' },
  );

export const blockLockerField = () =>
  field.object(
    {
      can_protect: field.boolean(),
      protection_type: field.select(BLOCKLOCKER_TYPES),
    },
    { scope: 'shared.blockLocker', name: 'BlockLocker' },
  );

const ANIMATION_TYPES = ['ANIMATION', 'MODELENGINE_ANIM'];

/** States of a furniture (Mechanics.furniture.states) – models for ITEM_MODEL states come from the model tab */
export const furnitureStatesField = () =>
  field.object(
    {
      next_after: field.text({ format: 'duration', placeholder: true }),
      reset_after: field.text({ format: 'duration', placeholder: true }),
      condition: field.text({ placeholder: true }),
      '*': field.map(
        field.object({
          type: field.select(['ITEM_MODEL', 'FURNITURE', 'CUSTOM_MODEL_DATA', 'MODELENGINE', 'ANIMATION', 'MODELENGINE_ANIM', 'DEFAULT'], {
            placeholder: true,
          }),
          item_model: field.text({ format: 'resource', ...whenType('ITEM_MODEL', 'FURNITURE') }),
          value: field.text(whenType('CUSTOM_MODEL_DATA')),
          blueprint: field.text(whenType('MODELENGINE', 'MODELENGINE_ANIM')),
          animation: field.text(whenType(...ANIMATION_TYPES)),
          lerp_in: field.text({ format: 'duration', ...whenType(...ANIMATION_TYPES) }),
          lerp_out: field.text({ format: 'duration', ...whenType(...ANIMATION_TYPES) }),
          speed: field.number({ min: 0, step: 0.1, ...whenType(...ANIMATION_TYPES) }),
          force: field.boolean(whenType(...ANIMATION_TYPES)),
          properties: field.yaml({ placeholder: true, ...whenType('FURNITURE') }),
          hitbox: field.yaml({ placeholder: true, ...whenType('FURNITURE') }),
          next_after: field.text({ format: 'duration' }),
          reset_after: field.text({ format: 'duration' }),
          conditions: field.stringList({ placeholder: true }),
        }),
        { name: 'States', keyPlaceholder: true, reservedKeys: [...RESERVED_STATE_KEYS], newValue: () => ({}) },
      ),
    },
    { scope: 'shared.furnitureStates', help: true },
  );

/** Text above a furniture (Mechanics.furniture.text_entities) */
export const textEntitiesField = () =>
  field.objectList(
    {
      text: field.stringList({ format: 'minimessage', placeholder: true }),
      offset: field.text({ format: 'vector', placeholder: true }),
      line_width: field.number({ integer: true, min: 1, placeholder: true }),
      text_opacity: field.number({ integer: true, min: -1, max: 255 }),
      background_color: field.text({ placeholder: true }),
      alignment: field.select(['LEFT', 'CENTER', 'RIGHT']),
      tracking_rotation: field.select(TRACKING_ROTATIONS),
      shadow: field.boolean(),
      see_through: field.boolean(),
      translation: field.text({ format: 'vector' }),
      scale: field.text({ format: 'vector' }),
      left_rotation: field.text({ placeholder: true, advanced: true }),
      right_rotation: field.text({ placeholder: true, advanced: true }),
      brightness: field.object(
        {
          block_light: field.number({ integer: true, min: 0, max: 15 }),
          sky_light: field.number({ integer: true, min: 0, max: 15 }),
        },
        { advanced: true },
      ),
      view_range: field.number({ min: 0, step: 0.1, advanced: true }),
    },
    { scope: 'shared.textEntities', help: true, newItem: () => ({ text: [''], offset: '0,1,0' }) },
  );

export const clickActionsField = () =>
  field.objectList(
    {
      conditions: field.stringList({ placeholder: true }),
      actions: field.stringList({ placeholder: true }),
    },
    { scope: 'shared.clickActions', help: true, newItem: () => ({ conditions: [], actions: ['[message] <green>Hello <player>!'] }) },
  );
