/** The armor settings property (`item.armor`), shared by the Nexo and the CraftEngine form. */
import { ARMOR_EQUIPMENT_TYPES, ARMOR_LAYERS, ARMOR_OVERLAY_KEYS, type ArmorLayerDef, type ArmorSection } from '../project/armor';
import { field, type FieldSpecs, type PropertySpec } from './build';

const textureField = (layer: ArmorLayerDef) => field.texture({ sizeHint: layer.sizeHint, minVersion: layer.minVersion, help: layer.help });

/** Texture fields of the armor layers stored at the top level or in a section of the armor settings */
const layerFields = (section: ArmorSection | null): FieldSpecs =>
  Object.fromEntries(ARMOR_LAYERS.filter((layer) => layer.section === section).map((layer) => [layer.key, textureField(layer)]));

/** Texture fields of the overlays: one per player and elytra layer */
const overlayFields = (): FieldSpecs =>
  Object.fromEntries(
    ARMOR_LAYERS.filter((layer) => (ARMOR_OVERLAY_KEYS as readonly string[]).includes(layer.key)).map((layer) => [
      layer.key,
      field.texture({ minVersion: layer.minVersion }),
    ]),
  );

/** Where the armor property and its equipment options are documented, per plugin */
export interface ArmorPropertyDocs {
  /** The page of the armor property */
  page: string;
  /** The section on the equipment model's layer options (overlays, dyeable, player texture) */
  options: string;
  /** CraftEngine only: the section on trim-based equipment; without it the form has no equipment type */
  trim?: string;
}

/**
 * The armor property; each form lists it under the id `armor` and has its messages at `properties.armor`. The layer
 * options (overlays, dyeable, player texture) go into the equipment model; the equipment type is CraftEngine's.
 */
export function armorProperty(docs: ArmorPropertyDocs): PropertySpec {
  const options = { docs: docs.options, advanced: true };
  return {
    storage: 'armor',
    hint: true,
    docs: docs.page,
    field: field.object({
      set: field.text({ name: 'Set ID', placeholder: true, format: 'resource' }),
      ...(docs.trim && { type: field.select(ARMOR_EQUIPMENT_TYPES, { help: true, docs: docs.trim, advanced: true }) }),
      ...layerFields(null),
      mob: field.object(layerFields('mob')),
      saddles: field.object(layerFields('saddles'), { help: true }),
      overlays: field.object(overlayFields(), { help: true, ...options }),
      dyeable: field.boolean({ help: true, ...options }),
      color_when_undyed: field.text({ format: 'color', placeholder: true, help: true, ...options }),
      use_player_texture: field.boolean({ help: true, ...options }),
    }),
    defaultValue: () => ({ set: '' }),
  };
}
