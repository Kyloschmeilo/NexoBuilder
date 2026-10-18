import { afterEach, describe, expect, it } from 'vitest';
import {
  type ConfigValue,
  createFolder,
  createProject,
  insertFolder,
  insertNewItem,
  type PackTargetId,
} from '@resourcepackbuilder/core/project';
import { blockBehaviorTypes } from '@resourcepackbuilder/core/craftEngine';
import { getProject, setProject } from '../store/project';
import {
  addBlockBehaviors,
  promoteBlockBehavior,
  removeBlockBehavior,
  setItemPlaces,
  updateBlockBehavior,
  updateCraftEngineBlock,
} from './items';

/** A project of the target with one item; returns the item's id. */
function openProjectWithItem(target: PackTargetId): string {
  const project = createProject('Ruby', 'ruby', undefined, target);
  const folder = createFolder('Blocks', null);
  insertFolder(project, folder);
  const item = insertNewItem(project, { displayName: 'Ruby Crop', itemId: 'ruby_crop', folderId: folder.id, model: null });
  setProject(project);
  return item.id;
}

const config = (itemId: string) => getProject()!.items[itemId]!.config;
const block = (itemId: string) => config(itemId).block as Record<string, unknown>;

afterEach(() => setProject(null));

describe('what an item places', () => {
  it('switches a CraftEngine item between nothing, a block and furniture', () => {
    const id = openProjectWithItem('craftengine');
    setItemPlaces(id, 'block');
    expect(block(id)).toMatchObject({ state: { auto_state: 'solid' } });
    // Choosing block again keeps the block as it is
    addBlockBehaviors(id, ['bouncing_block']);
    setItemPlaces(id, 'block');
    expect(blockBehaviorTypes(block(id))).toContain('bouncing_block');
    setItemPlaces(id, 'furniture');
    expect(config(id).block).toBeUndefined();
    expect(config(id).furniture).toBeDefined();
    setItemPlaces(id, 'nothing');
    expect(config(id).furniture).toBeUndefined();
  });

  it('switches a Nexo item between the custom block and the furniture mechanic', () => {
    const id = openProjectWithItem('nexo');
    setItemPlaces(id, 'block');
    const mechanics = () => config(id).Mechanics as Record<string, unknown> | undefined;
    expect(mechanics()?.custom_block).toMatchObject({ type: 'NOTEBLOCK' });
    setItemPlaces(id, 'furniture');
    expect(mechanics()?.custom_block).toBeUndefined();
    expect(mechanics()?.furniture).toBeDefined();
    setItemPlaces(id, 'nothing');
    expect(mechanics()?.furniture).toBeUndefined();
  });
});

describe('block behavior commands', () => {
  it('adds behaviors in order, the first preset setting up the states', () => {
    const id = openProjectWithItem('craftengine');
    setItemPlaces(id, 'block');
    addBlockBehaviors(id, ['crop_block', 'lamp_block', 'crop_block']);
    expect(block(id).behavior).toEqual({ type: 'crop_block' });
    expect(block(id).states).toBeDefined();
    expect(blockBehaviorTypes(block(id))).toEqual(['crop_block', 'liquid_flowable_block', 'bush_block', 'lamp_block']);
  });

  it('edits and removes one behavior where it lives', () => {
    const id = openProjectWithItem('craftengine');
    setItemPlaces(id, 'block');
    addBlockBehaviors(id, ['crop_block']);
    updateBlockBehavior(id, { key: 'behavior', index: 0 }, { type: 'crop_block', grow_speed: 0.5 });
    expect(block(id).behavior).toEqual({ type: 'crop_block', grow_speed: 0.5 });
    removeBlockBehavior(id, { key: 'behaviors', index: 0 });
    expect(blockBehaviorTypes(block(id))).toEqual(['crop_block', 'bush_block']);
    // Removing the main behavior keeps the states
    removeBlockBehavior(id, { key: 'behavior', index: 0 });
    expect(block(id).behavior).toBeUndefined();
    expect(block(id).states).toBeDefined();
  });

  it('makes a further behavior with a preset the main one', () => {
    const id = openProjectWithItem('craftengine');
    setItemPlaces(id, 'block');
    const behaviors: ConfigValue[] = [{ type: 'bouncing_block' }, { type: 'lamp_block', lit_sound: 'x' }];
    updateCraftEngineBlock(id, (b) => ({ ...b, behaviors }));
    // Without a preset nothing changes
    promoteBlockBehavior(id, { key: 'behaviors', index: 0 });
    expect(block(id).behavior).toBeUndefined();
    promoteBlockBehavior(id, { key: 'behaviors', index: 1 });
    expect(block(id).behavior).toEqual({ type: 'lamp_block', lit_sound: 'x' });
    expect(block(id).states).toBeDefined();
    expect(blockBehaviorTypes(block(id))).toEqual(['lamp_block', 'bouncing_block']);
  });
});
