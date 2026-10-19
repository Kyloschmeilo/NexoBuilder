/**
 * The parts of the furniture mechanic that other furniture keys repeat: the display properties (also a door's
 * `open_properties` and a FURNITURE state's `properties`) and the hitbox section (also a FURNITURE state's `hitbox`).
 * Their messages live in shared scopes (`shared.furnitureProperties`, `shared.furnitureHitbox`); each place names its
 * own label. The hitbox, seat, bed and light entries name the hand-written editors (`editor`) that read their text
 * into its parts.
 */
import { CULLABLE_STATES, DISPLAY_TRANSFORMS, TRACKING_ROTATIONS } from '../options';
import { field } from '../../../form/build';
import { NEXO_DOCS } from './docs';

const DOCS = NEXO_DOCS.furniture;

/** Message scope of the furniture mechanic's own fields. */
export const FURNITURE_FIELDS_SCOPE = 'properties.mechanicsFurniture.field.fields';

/** The hand-written editors of the furniture's text entries, by `Field.editor` name. */
export const NEXO_FURNITURE_EDITORS = {
  hitbox: 'nexo.furniture.hitbox',
  seats: 'nexo.furniture.seats',
  beds: 'nexo.furniture.beds',
  lights: 'nexo.furniture.lights',
} as const;

/** The display entity properties (`properties`), labelled by `label` (a full message key). */
export const furniturePropertiesSpec = (label: string) =>
  field.object(
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
      cullable: field.select(CULLABLE_STATES, { docs: DOCS.culling }),
      display_width: field.number({ min: 0, step: 0.1, docs: DOCS.culling }),
      display_height: field.number({ min: 0, step: 0.1, docs: DOCS.culling }),
      delay: field.text({ format: 'duration', placeholder: true, help: true, advanced: true, docs: DOCS.otherProperties }),
    },
    { docs: DOCS.properties, scope: 'shared.furnitureProperties', label },
  );

/** The hitbox section (`hitbox`), labelled by `label`: its four lists, edited together as one list of hitboxes. */
export const furnitureHitboxSpec = (label: string) =>
  field.object(
    {
      barriers: field.stringList({ placeholder: true, docs: DOCS.barriers }),
      interactions: field.stringList({ placeholder: true, docs: DOCS.interactions }),
      shulkers: field.stringList({ placeholder: true, docs: DOCS.shulkers }),
      ghasts: field.stringList({ placeholder: true, minVersion: '1.21.6', docs: DOCS.ghasts }),
    },
    { help: true, docs: DOCS.hitbox, editor: NEXO_FURNITURE_EDITORS.hitbox, scope: 'shared.furnitureHitbox', label },
  );
