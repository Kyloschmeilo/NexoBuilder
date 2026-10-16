import { ARMOR_LAYERS, type ArmorLayerDef, type ArmorSection } from '../../../project/armor';
import { field, properties, type FieldSpecs } from '../../../form/build';

const textureField = (layer: ArmorLayerDef) => field.texture({ sizeHint: layer.sizeHint, minVersion: layer.minVersion, help: layer.help });

/** Texture fields of the armor layers stored at the top level or in a section of the armor settings */
const layerFields = (section: ArmorSection | null): FieldSpecs =>
  Object.fromEntries(ARMOR_LAYERS.filter((layer) => layer.section === section).map((layer) => [layer.key, textureField(layer)]));

export const APPEARANCE_PROPERTIES = properties('appearance', {
  color: {
    field: field.text({ format: 'color', placeholder: true }),
    defaultValue: () => '255, 255, 255',
  },
  'Pack.oversized_in_gui': { field: field.boolean(), defaultValue: () => true, minVersion: '1.21.6' },
  'Pack.custom_model_data': { field: field.number({ integer: true, min: 1 }), defaultValue: () => 1000 },
  armor: {
    storage: 'armor',
    hint: true,
    field: field.object({
      set: field.text({ name: 'Set ID', placeholder: true, format: 'resource' }),
      ...layerFields(null),
      mob: field.object(layerFields('mob')),
      saddles: field.object(layerFields('saddles'), { help: true }),
    }),
    defaultValue: () => ({ set: '' }),
  },
});
