import { field, properties } from '../../../form/build';
import { withDocs } from '../../../form/docs';
import { CE_DOCS } from './docs';

/**
 * The item keys around the item's model (configuration/item/models): the root keys of the generated items model
 * definition, the model ids CraftEngine otherwise allocates itself, and the pre-1.21.4 `legacy_model`. Shown in the
 * model tab; the model tree itself is edited there too (`item.itemModel`, written as `model`).
 */
export const CE_MODEL_PROPERTIES = properties(
  'model',
  withDocs(`${CE_DOCS.itemModels}#root-fields`, {
    oversized_in_gui: { field: field.boolean({ defaultHint: true }), defaultValue: () => true, minVersion: '1.21.6' },
    hand_animation_on_swap: { field: field.boolean({ defaultHint: true }), defaultValue: () => false },
    swap_animation_scale: {
      field: field.number({ min: 0, step: 0.1, advanced: true }),
      defaultValue: () => 1,
      minVersion: '1.21.11',
    },
    item_model: {
      field: field.text({ format: 'resource', placeholder: true, advanced: true }),
      defaultValue: () => '',
      docs: `${CE_DOCS.itemModels}#when-to-set-them-manually`,
      hint: true,
    },
    custom_model_data: {
      field: field.number({ integer: true, min: 1, advanced: true }),
      defaultValue: () => 10000,
      docs: `${CE_DOCS.itemModels}#when-to-set-them-manually`,
    },
    legacy_model: {
      field: field.object(
        {
          path: field.text({ format: 'resource', placeholder: true }),
          generation: field.yaml({ help: true }),
          overrides: field.objectList(
            {
              path: field.text({ format: 'resource', placeholder: true }),
              predicate: field.map(field.number(), { keyPlaceholder: true, newValue: () => 1 }),
            },
            { newItem: () => ({ path: '', predicate: { custom_model_data: 1 } }) },
          ),
        },
        { advanced: true },
      ),
      defaultValue: () => ({ path: '' }),
      docs: `${CE_DOCS.itemModels}#legacy-model`,
      hint: true,
    },
  }),
);
