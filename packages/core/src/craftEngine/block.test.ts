import { describe, expect, it } from 'vitest';
import { createFolder, createItem, createProject, insertFolder, insertItem, type ConfigValue, type Project } from '../project';
import {
  autoStateCapacity,
  autoStateOverruns,
  CE_AUTO_STATE_GROUPS,
  countAutoStates,
  craftEngineBlockModel,
  newCraftEngineBlock,
} from './block';

/** A CraftEngine project with one item per `auto_state` value (null = an item without a block). */
function projectWith(version: string, autoStates: Array<ConfigValue | null>): Project {
  const project = createProject('Blöcke', 'bloecke', version, 'craftengine');
  const folder = createFolder('Steine', null);
  insertFolder(project, folder);
  autoStates.forEach((autoState, i) => {
    const item = createItem({ displayName: `B${i}`, itemId: `b${i}`, folderId: folder.id, material: 'PAPER', model: null });
    if (autoState !== null) item.config.block = { state: { auto_state: autoState } };
    insertItem(project, item);
  });
  return project;
}

const group = (id: string) => {
  const found = CE_AUTO_STATE_GROUPS.find((g) => g.id === id);
  if (!found) throw new Error(id);
  return found;
};

describe('auto_state budget', () => {
  it('offers the 24 groups of the plugin', () => {
    expect(CE_AUTO_STATE_GROUPS).toHaveLength(24);
    expect(newCraftEngineBlock()).toEqual({ state: { auto_state: 'solid' }, loot: { template: 'default:loot_table/self' } });
  });

  it('counts each block once and blocks with a shared id once per id', () => {
    const shared = { type: 'sugar_cane', id: 'transparent' };
    const counts = countAutoStates(projectWith('1.21.11', ['solid', 'solid', 'note_block', shared, shared, null]));
    expect(Object.fromEntries(counts)).toEqual({ solid: 2, note_block: 1, sugar_cane: 1 });
  });

  it('adds the states of newer Minecraft versions', () => {
    expect(autoStateCapacity(group('note_block'), '1.21.11')).toBe(1100);
    expect(autoStateCapacity(group('note_block'), '26.1')).toBe(1300);
    expect(autoStateCapacity(group('solid'), '26.3')).toBe(1489);
    expect(autoStateCapacity(group('sapling'), '26.3')).toBe(8);
  });

  it('lets the groups a group contains share its states', () => {
    // 15 sugar cane states: 16 blocks are too many
    expect(autoStateOverruns(projectWith('1.21.11', Array<string>(16).fill('sugar_cane')))).toEqual([
      { group: 'sugar_cane', used: 16, capacity: 15 },
    ]);
    // tripwire holds the 63 lower and the 63 higher ones: 64 + 63 overrun both lower_tripwire and tripwire
    const tripwires = [...Array<string>(64).fill('lower_tripwire'), ...Array<string>(63).fill('higher_tripwire')];
    expect(autoStateOverruns(projectWith('1.21.11', tripwires)).map((o) => [o.group, o.used, o.capacity])).toEqual([
      ['tripwire', 127, 126],
      ['lower_tripwire', 64, 63],
    ]);
    expect(autoStateOverruns(projectWith('1.21.11', ['chorus']))).toEqual([{ group: 'chorus', used: 1, capacity: 0 }]);
  });
});

describe('block model', () => {
  it('shows a model with a shape of its own as it is', () => {
    expect(craftEngineBlockModel('a:block/x', { parent: 'minecraft:block/cube_all', textures: { all: 'a:block/x/t' } })).toEqual({
      model: { path: 'a:block/x' },
      unusedTextures: 0,
    });
    expect(craftEngineBlockModel('a:block/x', { elements: [] }).model).toEqual({ path: 'a:block/x' });
    expect(craftEngineBlockModel(null, null).model).toBeNull();
  });

  it('generates a cube from the layers of a flat model in layer order', () => {
    const flat = { parent: 'minecraft:item/generated', textures: { layer1: 'a:block/side', layer0: 'a:block/end' } };
    expect(craftEngineBlockModel('a:block/x', flat).model).toEqual({
      path: 'a:block/x-block',
      generation: { parent: 'minecraft:block/cube_column', textures: { end: 'a:block/end', side: 'a:block/side' } },
    });
  });
});
