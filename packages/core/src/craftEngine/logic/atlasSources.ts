/**
 * The sprite sources of a texture atlas (`atlases`, checked against the plugin's atlas package; 5): `directory`,
 * `single`, `filter`, `unstitch` and `paletted_permutations`, as in a vanilla atlas file. Texture ids name a texture
 * without `textures/` and `.png`. No type is Premium only.
 */
import { field } from '../../form/build';
import { logicCatalog } from './catalog';

/** A texture id, e.g. `minecraft:block/stone` */
const texture = () => field.text({ format: 'resource', placeholder: true, scope: 'logic.shared.atlasTexture' });

export const CE_ATLAS_SOURCES = logicCatalog('atlasSources', [
  {
    type: 'directory',
    fields: { source: field.text({ placeholder: true, help: true }), prefix: field.text({ placeholder: true, help: true }) },
  },
  { type: 'single', fields: { resource: texture(), sprite: field.text({ format: 'resource', placeholder: true, help: true }) } },
  {
    type: 'filter',
    fields: {
      pattern: field.object({ namespace: field.text({ placeholder: true }), path: field.text({ placeholder: true }) }, { help: true }),
    },
  },
  {
    type: 'unstitch',
    fields: {
      resource: texture(),
      divisor_x: field.number({ min: 0, help: true }),
      divisor_y: field.number({ min: 0, help: true }),
      regions: field.objectList(
        {
          sprite: field.text({ format: 'resource', placeholder: true }),
          x: field.number(),
          y: field.number(),
          width: field.number({ min: 0 }),
          height: field.number({ min: 0 }),
        },
        { titleKey: 'sprite', newItem: () => ({ sprite: '', x: 0, y: 0, width: 16, height: 16 }) },
      ),
    },
  },
  {
    type: 'paletted_permutations',
    fields: {
      textures: field.stringList({ format: 'resource', placeholder: true }),
      palette_key: texture(),
      separator: field.text({ placeholder: true, help: true }),
      permutations: field.map(field.text({ format: 'resource', placeholder: true }), {
        keyPlaceholder: true,
        help: true,
        newValue: () => '',
      }),
    },
  },
]);
