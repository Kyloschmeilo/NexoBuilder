/** The furniture mechanic (Mechanics.furniture) – the largest property, hence its own module. */
import { DISPLAY_TRANSFORMS, TRACKING_ROTATIONS } from '../options';
import { field, type PropertySpec } from '../../../form/build';
import { NEXO_DOCS } from './docs';
import {
  blockLockerField,
  blockSoundsField,
  clickActionsField,
  dropField,
  furnitureStatesField,
  limitedPlacingField,
  soundField,
  storageField,
  textEntitiesField,
} from './shared';

const DOCS = NEXO_DOCS.furniture;

/** Each option links to its page or section of the furniture mechanic's docs. */
export const FURNITURE: PropertySpec = {
  conflicts: ['Mechanics.custom_block'],
  keepEmpty: true,
  docs: DOCS.page,
  field: field.object({
    hitbox: field.object(
      {
        barriers: field.stringList({ placeholder: true, docs: DOCS.barriers }),
        interactions: field.stringList({ placeholder: true, docs: DOCS.interactions }),
        shulkers: field.stringList({ placeholder: true, docs: DOCS.shulkers }),
        ghasts: field.stringList({ placeholder: true, minVersion: '1.21.6', docs: DOCS.ghasts }),
      },
      { help: true, docs: DOCS.hitbox },
    ),
    properties: field.object(
      {
        display_transform: field.select(DISPLAY_TRANSFORMS, { placeholder: true, docs: DOCS.displayTransform }),
        tracking_rotation: field.select(TRACKING_ROTATIONS, { docs: DOCS.trackingRotation }),
        translation: field.text({ format: 'vector', placeholder: true, docs: DOCS.translation }),
        scale: field.text({ format: 'vector', placeholder: true, docs: DOCS.scale }),
        left_rotation: field.text({ placeholder: true, docs: DOCS.rotation }),
        right_rotation: field.text({ placeholder: true, docs: DOCS.rotation }),
        brightness: field.object(
          {
            block_light: field.number({ integer: true, min: 0, max: 15 }),
            sky_light: field.number({ integer: true, min: 0, max: 15 }),
          },
          { docs: DOCS.brightness },
        ),
        view_range: field.number({ min: 0, step: 0.1, docs: DOCS.otherProperties }),
        shadow_radius: field.number({ min: 0, step: 0.1, docs: DOCS.otherProperties }),
        shadow_strength: field.number({ min: 0, step: 0.1, docs: DOCS.otherProperties }),
        glow_color: field.text({ placeholder: true, docs: DOCS.otherProperties }),
        offset_against_blocks: field.boolean({ defaultHint: true, docs: DOCS.offsetAgainstBlocks }),
        cullable: field.boolean({ docs: DOCS.culling }),
        display_width: field.number({ min: 0, step: 0.1, docs: DOCS.culling }),
        display_height: field.number({ min: 0, step: 0.1, docs: DOCS.culling }),
      },
      { docs: DOCS.properties },
    ),
    rotatable: field.boolean({ docs: DOCS.rotatable }),
    restricted_rotation: field.select(['STRICT', 'VERY_STRICT'], { docs: DOCS.restrictedRotation }),
    waterloggable: field.boolean({ docs: DOCS.waterloggable }),
    seats: field.stringList({ placeholder: true, docs: DOCS.seats }),
    beds: field.stringList({ placeholder: true, docs: DOCS.beds }),
    lights: field.object(
      {
        lights: field.stringList({ placeholder: true }),
        toggleable: field.boolean(),
        toggled_model: field.text({ placeholder: true }),
        toggled_item_model: field.text({ format: 'resource' }),
      },
      { docs: DOCS.lights },
    ),
    connectable: field.object(
      {
        type: field.select(['ITEM_MODEL', 'ITEM']),
        default: field.text(),
        straight: field.text(),
        left: field.text(),
        right: field.text(),
        inner: field.text(),
        outer: field.text(),
      },
      { help: true, minVersion: '1.21.4', docs: DOCS.connectable },
    ),
    states: { ...furnitureStatesField(), docs: DOCS.states },
    text_entities: { ...textEntitiesField(), docs: DOCS.textEntities },
    block_sounds: { ...blockSoundsField(), docs: DOCS.blockSounds },
    drop: { ...dropField(), docs: DOCS.drop },
    limited_placing: { ...limitedPlacingField(true), docs: DOCS.limitedPlacing },
    storage: { ...storageField(), docs: DOCS.storage },
    jukebox: field.object(
      {
        volume: field.number({ min: 0, step: 0.1 }),
        pitch: field.number({ min: 0, step: 0.1 }),
        permission: field.text(),
      },
      { docs: DOCS.jukebox },
    ),
    door: field.object(
      {
        is_sliding: field.boolean(),
        open_sound: soundField(),
        close_sound: soundField(),
        toggle_hitbox_on_open: field.boolean(),
        delay_hitbox_toggle: field.boolean(),
        automatic_close_delay: field.text({ format: 'duration' }),
        open_properties: field.yaml({ placeholder: true }),
      },
      { docs: DOCS.door },
    ),
    evolution: field.object(
      {
        delay: field.text({ format: 'duration', placeholder: true }),
        probability: field.number({ min: 0, max: 1, step: 0.05 }),
        light_boost: field.boolean(),
        bone_meal_chance: field.number({ min: 0, max: 1, step: 0.05 }),
        next_stage: field.text(),
      },
      { docs: DOCS.evolution },
    ),
    preview_placement: field.object(
      {
        opacity: field.number({ min: 0, max: 1, step: 0.05 }),
        require_permission: field.boolean(),
      },
      { emptyValue: true, help: true, docs: DOCS.previewPlacement },
    ),
    blocklocker: { ...blockLockerField(), docs: DOCS.blocklocker },
    modelengine_id: field.text({ name: 'ModelEngine ID', placeholder: true, docs: DOCS.modelengine }),
    clickActions: { ...clickActionsField(), docs: NEXO_DOCS.mechanics.clickActions },
    placements: field.yaml({ help: true, placeholder: true, docs: DOCS.placements }),
  }),
  defaultValue: () => ({ hitbox: { barriers: ['0,0,0'] }, rotatable: true }),
};
