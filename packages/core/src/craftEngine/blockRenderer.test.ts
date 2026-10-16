import { describe, expect, it } from 'vitest';
import { buildRenderer, rendererElementPose, rendererElements, turnRenderer, withRendererElements } from './blockRenderer';
import { withFacing } from './blockStates';

describe('block entity renderers', () => {
  it('reads the renderer as one element or a list, under each name CraftEngine reads', () => {
    expect(rendererElements({ entity_renderer: { item: 'm:a' } })).toEqual([{ item: 'm:a' }]);
    expect(rendererElements({ entity_render: [{ item: 'm:a' }, 'x', { text: 'b' }] })).toEqual([{ item: 'm:a' }, { text: 'b' }]);
    expect(rendererElements({ 'entity-renderer': { block: 'minecraft:stone' } })).toEqual([{ block: 'minecraft:stone' }]);
    expect(rendererElements({ auto_state: 'solid' })).toEqual([]);
  });

  it('writes the elements under entity_renderer, and removes the renderer without any', () => {
    expect(withRendererElements({ auto_state: 'solid', entity_render: { item: 'm:a' } }, [{ item: 'm:b' }])).toEqual({
      auto_state: 'solid',
      entity_renderer: [{ item: 'm:b' }],
    });
    expect(withRendererElements({ auto_state: 'solid', entity_renderer: [{ item: 'm:b' }] }, [])).toEqual({ auto_state: 'solid' });
  });

  it('builds each element with its type and the block item where it shows one', () => {
    expect(buildRenderer({ entity_renderer: { rotation: 90 } }, 'm:sofa')).toEqual({
      entity_renderer: { type: 'item_display', item: 'm:sofa', rotation: 90 },
    });
    expect(buildRenderer({ entity_renderer: [{ text: 'Hi' }, { type: 'craftengine:item', item: 'm:x' }] }, 'm:sofa')).toEqual({
      entity_renderer: [
        { type: 'text_display', text: 'Hi' },
        { type: 'item', item: 'm:x' },
      ],
    });
    expect(buildRenderer({ auto_state: 'solid' }, 'm:sofa')).toEqual({ auto_state: 'solid' });
  });

  it('places elements at the block center by default, block displays at its corner', () => {
    expect(rendererElementPose({ item: 'm:a' }).position).toEqual([0.5, 0.5, 0.5]);
    expect(rendererElementPose({ block: 'minecraft:stone' }).position).toEqual([0, 0, 0]);
    expect(rendererElementPose({ item: 'm:a', position: '0.5,0,0.5' }).position).toEqual([0.5, 0, 0.5]);
  });

  it('turns elements around the block center', () => {
    const state = {
      entity_renderer: [
        { item: 'm:a' },
        { item: 'm:b', position: '0.5,0.5,0', yaw: -90 },
        { type: 'block_display', block: 'minecraft:stone' },
        { type: 'item', item: 'm:c', position: '0.5,0.2,0.1' },
      ],
    };
    expect(turnRenderer(state, 90).entity_renderer).toEqual([
      { item: 'm:a', yaw: 90 },
      { item: 'm:b', position: '1,0.5,0.5' },
      { type: 'block_display', block: 'minecraft:stone', yaw: 90, position: '1,0,0' },
      { type: 'item', item: 'm:c', position: '0.9,0.2,0.5' },
    ]);
    expect(turnRenderer(state, 180).entity_renderer).toEqual([
      { item: 'm:a', yaw: 180 },
      { item: 'm:b', position: '0.5,0.5,1', yaw: 90 },
      { type: 'block_display', block: 'minecraft:stone', yaw: 180, position: '1,0,1' },
      { type: 'item', item: 'm:c', position: '0.5,0.2,0.9' },
    ]);
    expect(turnRenderer(state, 0)).toBe(state);
  });

  it('turns the renderer of each look when the block faces the player, without a model for a transparent look', () => {
    const states = withFacing({
      properties: {},
      appearances: {
        sofa: { auto_state: { type: 'sugar_cane', id: 'transparent' }, transparent: true, entity_renderer: { item: 'm:sofa' } },
      },
      variants: {},
    });
    expect(states.appearances).toEqual({
      sofa_north: { auto_state: { type: 'sugar_cane', id: 'transparent' }, transparent: true, entity_renderer: { item: 'm:sofa' } },
      sofa_east: {
        auto_state: { type: 'sugar_cane', id: 'transparent' },
        transparent: true,
        entity_renderer: { item: 'm:sofa', yaw: 90 },
      },
      sofa_south: {
        auto_state: { type: 'sugar_cane', id: 'transparent' },
        transparent: true,
        entity_renderer: { item: 'm:sofa', yaw: 180 },
      },
      sofa_west: {
        auto_state: { type: 'sugar_cane', id: 'transparent' },
        transparent: true,
        entity_renderer: { item: 'm:sofa', yaw: -90 },
      },
    });
  });
});
