import { describe, expect, it } from 'vitest';
import type { ConfigObject } from '../project/types';
import {
  addBlockBehavior,
  addsBlockBehaviorPreset,
  blockBehaviorEntries,
  blockBehaviorTypes,
  canPromoteBlockBehavior,
  promoteBlockBehavior,
  withBlockBehavior,
} from './blockBehaviorList';
import { newCraftEngineBlock } from './block';

const KEY = 'ruby:ruby_crop';
const SINGLE: ConfigObject = { auto_state: 'solid' };

describe('the block behavior list', () => {
  it('lists the main behavior first, then the further behaviors, with where each lives', () => {
    const block = { behavior: { type: 'crop_block' }, behaviors: [{ type: 'bush_block' }, { type: 'my_addon:glow' }] };
    expect(blockBehaviorEntries(block)).toEqual([
      { ref: { key: 'behavior', index: 0 }, entry: { type: 'crop_block' }, type: 'crop_block', main: true },
      { ref: { key: 'behaviors', index: 0 }, entry: { type: 'bush_block' }, type: 'bush_block', main: false },
      { ref: { key: 'behaviors', index: 1 }, entry: { type: 'my_addon:glow' }, type: 'my_addon:glow', main: false },
    ]);
    expect(blockBehaviorTypes(block)).toEqual(['crop_block', 'bush_block', 'my_addon:glow']);
  });

  it('reads a single further behavior and a main behavior written as a list', () => {
    const entries = blockBehaviorEntries({ behavior: [{ type: 'a' }, { type: 'b' }], behaviors: { type: 'c' } });
    expect(entries.map((e) => [e.ref.key, e.ref.index, e.type, e.main])).toEqual([
      ['behavior', 0, 'a', false],
      ['behavior', 1, 'b', false],
      ['behaviors', 0, 'c', false],
    ]);
    expect(blockBehaviorEntries({})).toEqual([]);
    expect(blockBehaviorEntries({ behaviors: ['text'] })[0]?.type).toBeUndefined();
  });

  it('replaces and removes entries, keeping a single behavior single and dropping empty lists', () => {
    const block: ConfigObject = { behavior: { type: 'crop_block' }, behaviors: [{ type: 'bush_block' }, { type: 'falling_block' }] };
    expect(withBlockBehavior(block, { key: 'behavior', index: 0 }, { type: 'crop_block', grow_speed: 0.5 }).behavior).toEqual({
      type: 'crop_block',
      grow_speed: 0.5,
    });
    expect(withBlockBehavior(block, { key: 'behaviors', index: 1 }, undefined).behaviors).toEqual([{ type: 'bush_block' }]);
    expect(withBlockBehavior(block, { key: 'behavior', index: 0 }, undefined)).toEqual({ behaviors: block.behaviors });
    const one = withBlockBehavior(block, { key: 'behaviors', index: 0 }, undefined);
    expect(Object.hasOwn(withBlockBehavior(one, { key: 'behaviors', index: 0 }, undefined), 'behaviors')).toBe(false);
    // Out of range and missing keys change nothing
    expect(withBlockBehavior(block, { key: 'behaviors', index: 5 }, undefined)).toBe(block);
    expect(withBlockBehavior({}, { key: 'behaviors', index: 0 }, undefined)).toEqual({});
    // The input is never touched
    expect(block.behaviors).toHaveLength(2);
  });

  it('applies the preset of the first behavior with one, and appends everything else', () => {
    const plain = newCraftEngineBlock();
    expect(addsBlockBehaviorPreset(plain, 'crop_block')).toBe(true);
    const crop = addBlockBehavior(plain, 'crop_block', KEY, SINGLE);
    expect(crop.behavior).toEqual({ type: 'crop_block' });
    // The preset brings its states and support behaviors
    expect(crop.states).toBeDefined();
    expect(blockBehaviorTypes(crop)).toEqual(['crop_block', 'liquid_flowable_block', 'bush_block']);

    // A main behavior is set up now: a second preset type is only appended
    expect(addsBlockBehaviorPreset(crop, 'lamp_block')).toBe(false);
    const lamp = addBlockBehavior(crop, 'lamp_block', KEY, SINGLE);
    expect(lamp.behavior).toEqual({ type: 'crop_block' });
    expect(lamp.states).toEqual(crop.states);
    expect(blockBehaviorTypes(lamp)).toEqual(['crop_block', 'liquid_flowable_block', 'bush_block', 'lamp_block']);

    // Types without a preset are appended; a type the block has is not added twice
    const bouncy = addBlockBehavior(lamp, 'bouncing_block', KEY, SINGLE);
    expect((bouncy.behaviors as unknown[]).at(-1)).toEqual({ type: 'bouncing_block' });
    expect(addBlockBehavior(bouncy, 'bush_block', KEY, SINGLE)).toBe(bouncy);
  });

  it('keeps a single further behavior when another one is appended', () => {
    const block = addBlockBehavior({ behaviors: { type: 'bush_block' } }, 'chime_block', KEY, SINGLE);
    expect(block.behaviors).toEqual([{ type: 'bush_block' }, { type: 'chime_block' }]);
  });

  it('makes a further behavior with a preset the main one, keeping the keys the user set', () => {
    const block: ConfigObject = {
      ...newCraftEngineBlock(),
      behavior: { type: 'my_addon:glow' },
      behaviors: [{ type: 'falling_block' }, { type: 'lamp_block', lit_sound: 'x' }],
    };
    expect(canPromoteBlockBehavior(block)).toBe(true);
    const promoted = promoteBlockBehavior(block, { key: 'behaviors', index: 1 }, KEY, SINGLE);
    expect(promoted.behavior).toEqual({ type: 'lamp_block', lit_sound: 'x' });
    expect(promoted.states).toBeDefined();
    // The hand-written main behavior moves to the further ones; the lamp is not listed twice
    expect(blockBehaviorTypes(promoted)).toEqual(['lamp_block', 'falling_block', 'my_addon:glow']);
  });

  it('does not replace a main behavior that has a preset of its own', () => {
    const crop = addBlockBehavior(newCraftEngineBlock(), 'crop_block', KEY, SINGLE);
    const withLamp = addBlockBehavior(crop, 'lamp_block', KEY, SINGLE);
    expect(canPromoteBlockBehavior(withLamp)).toBe(false);
    const index = (withLamp.behaviors as unknown[]).length - 1;
    expect(promoteBlockBehavior(withLamp, { key: 'behaviors', index }, KEY, SINGLE)).toBe(withLamp);
    // Nor the main behavior itself, or a type without a preset
    const plain: ConfigObject = { behaviors: [{ type: 'bouncing_block' }] };
    expect(promoteBlockBehavior(plain, { key: 'behaviors', index: 0 }, KEY, SINGLE)).toBe(plain);
    expect(promoteBlockBehavior(crop, { key: 'behavior', index: 0 }, KEY, SINGLE)).toBe(crop);
  });
});
