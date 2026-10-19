/** The furniture mechanic (Mechanics.furniture) – the largest property, hence its own module. */
import { isPlainObject } from '@resourcepackbuilder/utils';
import { field, type PropertySpec } from '../../../form/build';
import { NEXO_DOCS } from './docs';
import { FURNITURE_FIELDS_SCOPE, furnitureHitboxSpec, furniturePropertiesSpec, NEXO_FURNITURE_EDITORS } from './furnitureParts';
import {
  blockLockerField,
  blockSoundsField,
  clickActionsField,
  dropField,
  furnitureStatesField,
  JAR_ONLY,
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
    hitbox: furnitureHitboxSpec(`${FURNITURE_FIELDS_SCOPE}.hitbox.label`),
    properties: furniturePropertiesSpec(`${FURNITURE_FIELDS_SCOPE}.properties.label`),
    rotatable: field.choice(
      {
        simple: { field: field.boolean(), matches: (value) => typeof value === 'boolean', newValue: () => true },
        // Nexo 1.30 also reads a section that can limit rotating to sneaking players
        section: {
          field: field.object({ rotatable: field.boolean(), on_sneak: field.boolean() }),
          matches: isPlainObject,
          newValue: () => ({ rotatable: true, on_sneak: true }),
        },
      },
      { docs: DOCS.rotatable },
    ),
    restricted_rotation: field.select(['NONE', 'STRICT', 'VERY_STRICT'], { docs: DOCS.restrictedRotation }),
    waterloggable: field.boolean({ docs: DOCS.waterloggable }),
    seats: field.stringList({ placeholder: true, docs: DOCS.seats, editor: NEXO_FURNITURE_EDITORS.seats }),
    beds: field.stringList({ placeholder: true, docs: DOCS.beds, editor: NEXO_FURNITURE_EDITORS.beds }),
    lights: field.object(
      {
        lights: field.stringList({ placeholder: true, editor: NEXO_FURNITURE_EDITORS.lights }),
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
        // A door shows these display properties while it is open
        open_properties: furniturePropertiesSpec(`${FURNITURE_FIELDS_SCOPE}.door.fields.openProperties.label`),
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
        minimum_light_level: field.number({ integer: true, min: 0, max: 15, ...JAR_ONLY }),
        boost_tick: field.number({ integer: true, min: 0, ...JAR_ONLY }),
        rain_boost_tick: field.number({ integer: true, min: 0, ...JAR_ONLY }),
      },
      { docs: DOCS.evolution },
    ),
    preview_placement: field.object(
      {
        enabled: field.boolean(),
        opacity: field.number({ min: 0, max: 1, step: 0.05 }),
        require_permission: field.boolean(),
      },
      { emptyValue: true, help: true, docs: DOCS.previewPlacement },
    ),
    blocklocker: { ...blockLockerField(), docs: DOCS.blocklocker },
    modelengine_id: field.text({ name: 'ModelEngine ID', placeholder: true, docs: DOCS.modelengine }),
    clickActions: { ...clickActionsField(), docs: NEXO_DOCS.mechanics.clickActions },
    placements: field.yaml({ help: true, placeholder: true, docs: DOCS.placements }),
    item: field.text({ placeholder: true, help: true, docs: DOCS.evolution }),
    farmland_required: field.boolean({ ...JAR_ONLY, docs: DOCS.evolution }),
    item_model: field.text({ format: 'resource', help: true, advanced: true, docs: DOCS.placements }),
    hardness: field.number({ min: 0, step: 0.5, ...JAR_ONLY }),
    blast_resistance: field.number({ min: 0, step: 0.5, ...JAR_ONLY }),
  }),
  defaultValue: () => ({ hitbox: { barriers: ['0,0,0'] }, rotatable: true }),
};
