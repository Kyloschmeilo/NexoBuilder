import { describe, expect, it } from 'vitest';
import {
  buildCraftEngineFurniture,
  formatFurnitureSeat,
  furnitureElementPose,
  furnitureElementType,
  furnitureHitboxBox,
  furnitureHitboxType,
  furnitureHitboxWithType,
  furnitureVariants,
  furnitureVariantsKey,
  interactionHitboxSize,
  parseCeRotation,
  parseCeVector,
  parseFurnitureSeat,
  rotationAngles,
} from './furniture';

const close = (actual: number[] | null, expected: number[]) => {
  expect(actual).not.toBeNull();
  actual?.forEach((n, i) => expect(n).toBeCloseTo(expected[i], 6));
};

describe('furniture values', () => {
  it('reads vectors as CraftEngine does', () => {
    expect(parseCeVector('0.5,0,-1')).toEqual([0.5, 0, -1]);
    expect(parseCeVector('1_000,0,0')).toEqual([1000, 0, 0]);
    expect(parseCeVector(2)).toEqual([2, 2, 2]);
    expect(parseCeVector([1, 2, 3])).toEqual([1, 2, 3]);
    expect(parseCeVector('1,2')).toBeNull();
    expect(parseCeVector('up')).toBeNull();
  });

  it('reads rotations as CraftEngine does (degrees x,y,z; a single angle turns around the vertical axis)', () => {
    const s = Math.SQRT1_2;
    close(parseCeRotation('90,0,0'), [s, 0, 0, s]);
    close(parseCeRotation('0,90,0'), [0, s, 0, s]);
    close(parseCeRotation('0,0,90'), [0, 0, s, s]);
    close(parseCeRotation(90), [0, -s, 0, s]);
    close(parseCeRotation('0,0,0,1'), [0, 0, 0, 1]);
    close(parseCeRotation(undefined), [0, 0, 0, 1]);
    expect(parseCeRotation([0, 90, 0])).toBeNull();
    expect(rotationAngles('10,20,30')).toEqual([10, 20, 30]);
    expect(rotationAngles(45)).toEqual([0, -45, 0]);
    expect(rotationAngles('0,0,0,1')).toBeNull();
  });

  it('reads and writes seats', () => {
    expect(parseFurnitureSeat('0,0,-0.1 0 true')).toEqual({ position: [0, 0, -0.1], yaw: 0 });
    expect(parseFurnitureSeat('1,0.2,0')).toEqual({ position: [1, 0.2, 0], yaw: null });
    expect(parseFurnitureSeat({ position: '0,1,0', yaw: 90 })).toEqual({ position: [0, 1, 0], yaw: 90 });
    expect(parseFurnitureSeat('a,b')).toBeNull();
    expect(formatFurnitureSeat({ position: [0, 0, -0.1], yaw: 0 })).toBe('0,0,-0.1 0');
  });
});

describe('buildCraftEngineFurniture', () => {
  it('moves the rules to the item and fills in the furniture item', () => {
    const built = buildCraftEngineFurniture(
      { rules: { ground: { rotation: 'four' } }, variants: { ground: { elements: [{ position: '0,0.5,0' }], hitboxes: [{}] } } },
      { settings: { hit_times: 2 } },
      'm:chair',
    );
    expect(built.rules).toEqual({ ground: { rotation: 'four' } });
    expect(built.furniture).toEqual({
      settings: { item: 'm:chair', hit_times: 2 },
      variants: {
        ground: { elements: [{ type: 'item_display', item: 'm:chair', position: '0,0.5,0' }], hitboxes: [{ type: 'interaction' }] },
      },
    });
  });
});

describe('furniture hitbox keys', () => {
  it('writes width and height for interaction hitboxes only', () => {
    const built = buildCraftEngineFurniture(
      {
        variants: {
          ground: {
            hitboxes: [
              { type: 'interaction', width: 2, height: 1, invisible: true },
              { type: 'happy_ghast', width: 1, height: 1, scale: 0.5, hard_collision: true },
              { type: 'shulker', width: 1, height: 1, peek: 20, interactive: true },
              { type: 'custom', width: 1, entity_type: 'slime' },
              { type: 'slime', width: 1 },
            ],
          },
        },
      },
      null,
      'm:chair',
    );
    const variants = built.furniture.variants as Record<string, { hitboxes: unknown[] }>;
    expect(variants.ground.hitboxes).toEqual([
      { type: 'interaction', width: 2, height: 1, invisible: true },
      { type: 'happy_ghast', scale: 0.5, hard_collision: true },
      { type: 'shulker', peek: 20, interactive: true },
      { type: 'custom', entity_type: 'slime' },
      { type: 'slime', width: 1 },
    ]);
  });

  it('drops the keys of the old type when a hitbox changes its type', () => {
    const interaction = { type: 'interaction', position: '0,0,0', width: 1, height: 1, seats: ['0,0,0'] };
    expect(furnitureHitboxWithType(interaction, 'shulker')).toEqual({ type: 'shulker', position: '0,0,0', seats: ['0,0,0'] });
    expect(furnitureHitboxWithType({ type: 'shulker', peek: 5, interactive: true }, 'interaction')).toEqual({
      type: 'interaction',
      interactive: true,
    });
  });
});

describe('furniture keys CraftEngine also reads', () => {
  it('reads types with the craftengine namespace, and fills in the own item for them', () => {
    expect(furnitureElementType({ type: 'craftengine:item_display' })).toBe('item_display');
    expect(furnitureElementType({ type: 'minecraft:item_display' })).toBe('minecraft:item_display');
    expect(furnitureHitboxType({ type: 'craftengine:shulker' })).toBe('shulker');
    const built = buildCraftEngineFurniture({ variants: { ground: { elements: [{ type: 'craftengine:item_display' }] } } }, null, 'm:lamp');
    expect(built.furniture.variants).toEqual({ ground: { elements: [{ type: 'item_display', item: 'm:lamp' }] } });
  });

  it('builds variants written under variant or placement, and the editor keeps them there', () => {
    expect(furnitureVariantsKey({})).toBe('variants');
    for (const key of ['variant', 'placement']) {
      const furniture = { [key]: { ground: { elements: [{}], hitboxes: [{ width: 1 }] } } };
      expect(Object.keys(furnitureVariants(furniture))).toEqual(['ground']);
      expect(furnitureVariantsKey(furniture)).toBe(key);
      expect(buildCraftEngineFurniture(furniture, null, 'm:x').furniture[key]).toEqual({
        ground: { elements: [{ type: 'item_display', item: 'm:x' }], hitboxes: [{ type: 'interaction', width: 1 }] },
      });
    }
  });

  it('keeps the item and loot arguments the definition sets', () => {
    const built = buildCraftEngineFurniture(
      {
        settings: { item: 'm:other' },
        variants: { ground: {} },
        loot: { template: 'default:loot_table/furniture', arguments: { item: 'm:drop', count: 2 } },
      },
      null,
      'm:x',
    );
    expect(built.furniture.settings).toEqual({ item: 'm:other' });
    expect(built.furniture.loot).toEqual({ template: 'default:loot_table/furniture', arguments: { item: 'm:drop', count: 2 } });
  });

  it('moves rules written in the raw furniture: to the item', () => {
    const built = buildCraftEngineFurniture({ variants: { ground: {} } }, { rules: { ground: { alignment: 'center' } } }, 'm:x');
    expect(built.rules).toEqual({ ground: { alignment: 'center' } });
    expect(built.furniture.rules).toBeUndefined();
  });
});

describe('furniture preview geometry', () => {
  it('reads the pose of an element', () => {
    expect(furnitureElementPose({ item: 'm:x', position: '0.5,0,0', translation: '0,0.5,0', scale: 2, yaw: 90 })).toEqual({
      type: 'item_display',
      item: 'm:x',
      position: [0.5, 0, 0],
      translation: [0, 0.5, 0],
      scale: [2, 2, 2],
      rotation: [0, 0, 0, 1],
      yaw: 90,
      pitch: 0,
      displayTransform: 'none',
    });
  });

  it('gives hitboxes their space', () => {
    expect(furnitureHitboxBox({ type: 'interaction', position: '0,0,0', width: 0.7, height: 1.2 })).toEqual({
      min: [-0.35, 0, -0.35],
      max: [0.35, 1.2, 0.35],
    });
    expect(furnitureHitboxBox({ scale: '2,3' })).toEqual({ min: [-1, 0, -1], max: [1, 3, 1] });
    expect(interactionHitboxSize({ scale: '2,3' })).toEqual({ width: 2, height: 3 });
    expect(interactionHitboxSize({ scale: 0.5 })).toEqual({ width: 0.5, height: 0.5 });
    expect(interactionHitboxSize({ width: 0.7 })).toEqual({ width: 0.7, height: null });
    // A fully open shulker reaches one more block towards its direction
    const shulker = furnitureHitboxBox({ type: 'shulker', position: '0,0,0', direction: 'east', peek: 100 });
    close(shulker.min, [-0.5, 0, -0.5]);
    close(shulker.max, [1.5, 1, 0.5]);
  });
});
