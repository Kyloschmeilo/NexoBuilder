import { describe, expect, it } from 'vitest';
import { buildItemConfig } from './itemConfig';
import { createItem, createProject } from '../project/factory';
import { unknownConfigPaths } from './schema';

describe('unknown config paths', () => {
  it('looks into property sections and reports everything else as a whole', () => {
    const config = {
      material: 'PAPER',
      lore: ['a'],
      custom_root: { nested: { deep: 1 } },
      Components: { max_stack_size: 1, some_new_component: { x: 1 } },
      Mechanics: 'not an object',
    };
    expect(unknownConfigPaths(config)).toEqual([['material'], ['custom_root'], ['Components', 'some_new_component'], ['Mechanics']]);
  });

  it('are kept by the export with only empty values dropped', () => {
    const project = createProject('T', 't');
    const item = createItem({ displayName: 'x', nexoId: 'x', folderId: 'f', model: null });
    item.config.custom_root = { keep: 'yes', empty: '' };
    item.config.Components = { max_stack_size: 1, some_new_component: { x: 1 }, blank: [] };
    const { config } = buildItemConfig({ project, item, modelKey: null });
    expect(config.custom_root).toEqual({ keep: 'yes' });
    expect(config.Components).toEqual({ max_stack_size: 1, some_new_component: { x: 1 } });
  });
});
