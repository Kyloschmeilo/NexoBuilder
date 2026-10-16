import { describe, expect, it } from 'vitest';
import { createFolder, createItem, createProject, insertFolder, insertItem, type ConfigObject, type Project } from '../project';
import { countAutoStates } from './block';
import { applyBlockBehavior, blockBehaviorPropertyIds, missingBehaviorProperties, sharedBaseBlocks } from './blockBehaviors';
import {
  blockPropertyTypes,
  CE_PROPERTY_TYPES,
  canonicalPropertyType,
  internalStateCount,
  newBlockProperty,
  parseVariantKey,
  propertyValues,
  toMultiState,
  toSingleState,
  withFacing,
} from './blockStates';

const SOLID = { auto_state: 'solid' };

/** A CraftEngine project with one block item per block definition. */
function projectWith(...blocks: ConfigObject[]): Project {
  const project = createProject('Blöcke', 'bloecke', '1.21.11', 'craftengine');
  const folder = createFolder('Steine', null);
  insertFolder(project, folder);
  blocks.forEach((block, i) => {
    const item = createItem({ displayName: `B${i}`, itemId: `b${i}`, folderId: folder.id, material: 'PAPER', model: null });
    item.config.block = block;
    insertItem(project, item);
  });
  return project;
}

const withBehavior = (type: string | null, block: ConfigObject = { state: SOLID }) => applyBlockBehavior(block, type, 'bloecke:b0', SOLID);

describe('block properties', () => {
  it('knows the property types of the plugin and their other names', () => {
    expect(CE_PROPERTY_TYPES).toHaveLength(14);
    expect(canonicalPropertyType('4-direction')).toBe('horizontal_direction');
    expect(canonicalPropertyType('6-direction')).toBe('direction');
    expect(canonicalPropertyType('color')).toBeUndefined();
  });

  it('lists the values of every type and counts the internal states', () => {
    expect(propertyValues({ type: 'boolean' })).toEqual(['true', 'false']);
    expect(propertyValues({ type: 'int', range: '1~3' })).toEqual(['1', '2', '3']);
    expect(propertyValues({ type: 'int', min: 0, max: 1 })).toEqual(['0', '1']);
    expect(propertyValues({ type: 'int' })).toBeNull();
    expect(propertyValues({ type: 'string', values: ['red', 'blue'] })).toEqual(['red', 'blue']);
    expect(propertyValues({ type: 'string' })).toBeNull();
    expect(propertyValues({ type: 'horizontal_direction' })).toEqual(['north', 'east', 'south', 'west']);
    expect(propertyValues({ type: 'direction', values: ['up', 'down'] })).toEqual(['up', 'down']);
    expect(propertyValues({ type: 'stairs_shape' })).toHaveLength(5);
    expect(internalStateCount({ waterlogged: { type: 'boolean' }, distance: { type: 'int', range: '1~7' } })).toBe(14);
    expect(internalStateCount({ broken: { type: 'string' } })).toBeNull();
    for (const type of CE_PROPERTY_TYPES) expect(propertyValues(newBlockProperty(type))?.length).toBeGreaterThan(1);
  });

  it('reads variant keys as property=value pairs', () => {
    expect(parseVariantKey('facing=north, open=true')).toEqual([
      ['facing', 'north'],
      ['open', 'true'],
    ]);
    expect(parseVariantKey('facing')).toBeNull();
  });
});

describe('editing states', () => {
  it('turns one state into the first appearance and back', () => {
    const multi = toMultiState({ state: { auto_state: 'leaves' }, loot: { template: 'x' } });
    expect(multi).toEqual({
      loot: { template: 'x' },
      states: { properties: {}, appearances: { default: { auto_state: 'leaves' } }, variants: {} },
    });
    expect(toSingleState(multi, SOLID)).toEqual({ loot: { template: 'x' }, state: { auto_state: 'leaves' } });
  });

  it('makes a block face the player with one turned appearance per direction', () => {
    const states = withFacing({
      properties: {},
      appearances: { default: { auto_state: 'solid', model: { path: 'a:block/b' } } },
      variants: {},
    });
    expect(states.properties).toEqual({ facing: { type: 'horizontal_direction', default: 'north' } });
    expect(states.appearances).toEqual({
      north: { auto_state: 'solid', model: { path: 'a:block/b' } },
      east: { auto_state: 'solid', model: { path: 'a:block/b', y: 90 } },
      south: { auto_state: 'solid', model: { path: 'a:block/b', y: 180 } },
      west: { auto_state: 'solid', model: { path: 'a:block/b', y: 270 } },
    });
    expect(Object.keys(states.variants as object)).toEqual(['facing=north', 'facing=east', 'facing=south', 'facing=west']);
  });
});

describe('block behaviors', () => {
  it('sets up the states a behavior needs and drops them again for a plain block', () => {
    const slab = withBehavior('slab_block', { state: SOLID, loot: { template: 'default:loot_table/self' }, settings: { hardness: 2 } });
    expect(slab).toEqual({
      settings: { hardness: 2 },
      behavior: { type: 'slab_block' },
      states: { template: 'default:block_state/slab', arguments: { slab_base_block: 'cut_copper_slab' } },
      loot: { template: 'default:loot_table/slab' },
    });
    expect(withBehavior(null, slab)).toEqual({ settings: { hardness: 2 }, state: SOLID, loot: { template: 'default:loot_table/self' } });
    expect(blockBehaviorPropertyIds(slab)).toEqual(['block.states.arguments.slab_base_block', 'block.behaviors']);
  });

  it('keeps drops the user chose and the single state of a behavior without properties', () => {
    const own = { state: { auto_state: 'leaves' }, loot: { template: 'my:loot' } };
    expect(withBehavior('door_block', own).loot).toEqual({ template: 'my:loot' });
    expect(withBehavior('seat_block', own)).toEqual({ ...own, behavior: { type: 'seat_block', seats: ['0,0,0'] } });
  });

  it('writes a crop out with one appearance per age and the support of the jar’s plants', () => {
    const crop = withBehavior('crop_block');
    expect(crop.behaviors).toEqual([{ type: 'liquid_flowable_block' }, { type: 'bush_block', bottom_blocks: ['minecraft:farmland'] }]);
    expect(blockPropertyTypes(crop)).toEqual({ age: 'int' });
    expect(missingBehaviorProperties(crop, blockPropertyTypes(crop))).toEqual([]);
  });

  it('reports the properties a behavior needs that the states lack', () => {
    const lamp = { state: SOLID, behavior: { type: 'lamp_block' } };
    expect(missingBehaviorProperties(lamp, blockPropertyTypes(lamp))).toEqual([
      { behavior: 'lamp_block', property: 'lit', type: 'boolean' },
    ]);
    // A toggleable lamp that no hand switches needs `powered` too; a facing of 6 directions is a Direction as well
    const toggle = { states: { properties: { lit: { type: 'boolean' } } }, behavior: { type: 'toggleable_lamp_block' } };
    expect(missingBehaviorProperties(toggle, blockPropertyTypes(toggle)).map((m) => m.property)).toEqual(['powered']);
    const sofa = {
      states: { properties: { facing: { type: '4-direction' }, shape: { type: 'sofa_shape' } } },
      behavior: { type: 'sofa_block' },
    };
    expect(missingBehaviorProperties(sofa, blockPropertyTypes(sofa))).toEqual([]);
    // A template the editor knows brings its properties; one it does not know is not checked
    expect(missingBehaviorProperties(withBehavior('stairs_block'), blockPropertyTypes(withBehavior('stairs_block')))).toEqual([]);
    const unknown = { states: { template: 'my:states' }, behavior: { type: 'lamp_block' } };
    expect(missingBehaviorProperties(unknown, blockPropertyTypes(unknown))).toEqual([]);
  });

  it('finds vanilla blocks that several blocks borrow', () => {
    const project = projectWith(
      withBehavior('slab_block'),
      withBehavior('slab_block'),
      withBehavior('fence_block'),
      withBehavior('fence_block'),
    );
    expect(sharedBaseBlocks(project)).toEqual([{ block: 'cut_copper_slab', blocks: ['bloecke:b0', 'bloecke:b1'] }]);
  });
});

describe('auto_state budget of several states', () => {
  it('counts one state per appearance, shared ids once, and the leaves template twice', () => {
    const shared = { type: 'sugar_cane', id: 'x' };
    const project = projectWith(
      withBehavior('crop_block'),
      { states: { appearances: { a: { auto_state: shared }, b: { auto_state: shared }, c: { auto_state: 'cave_vine' } } } },
      withBehavior('leaves_block'),
      withBehavior('stairs_block'),
    );
    expect(Object.fromEntries(countAutoStates(project))).toEqual({
      tripwire: 3,
      sugar_cane: 1,
      cave_vines: 1,
      non_tintable_leaves: 1,
      waterlogged_non_tintable_leaves: 1,
    });
  });
});
