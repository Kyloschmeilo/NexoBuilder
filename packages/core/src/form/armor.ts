/** The armor settings property (`item.armor`), shared by the Nexo and the CraftEngine form. */
import { ARMOR_LAYERS, type ArmorLayerDef, type ArmorSection } from '../project/armor';
import { field, type FieldSpecs, type PropertySpec } from './build';

const textureField = (layer: ArmorLayerDef) => field.texture({ sizeHint: layer.sizeHint, minVersion: layer.minVersion, help: layer.help });

/** Texture fields of the armor layers stored at the top level or in a section of the armor settings */
const layerFields = (section: ArmorSection | null): FieldSpecs =>
  Object.fromEntries(ARMOR_LAYERS.filter((layer) => layer.section === section).map((layer) => [layer.key, textureField(layer)]));

/** The armor property; each form lists it under the id `armor` and has its messages at `properties.armor`. */
export const ARMOR_PROPERTY: PropertySpec = {
  storage: 'armor',
  hint: true,
  field: field.object({
    set: field.text({ name: 'Set ID', placeholder: true, format: 'resource' }),
    ...layerFields(null),
    mob: field.object(layerFields('mob')),
    saddles: field.object(layerFields('saddles'), { help: true }),
  }),
  defaultValue: () => ({ set: '' }),
};
