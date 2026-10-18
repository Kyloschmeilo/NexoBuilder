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
  withLightObjects,
  type FurnitureSeat,
  type Vec3,
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
    const seat = (position: Vec3, yaw: number | null, more: Partial<FurnitureSeat> = {}): FurnitureSeat => ({
      position,
      yaw,
      forcePlayerRotation: null,
      limitPlayerRotation: null,
      ...more,
    });
    expect(parseFurnitureSeat('0,0,-0.1 0 true')).toEqual(seat([0, 0, -0.1], 0, { forcePlayerRotation: true }));
    expect(parseFurnitureSeat('0,0,-0.1 90 45.5')).toEqual(seat([0, 0, -0.1], 90, { forcePlayerRotation: 45.5 }));
    expect(parseFurnitureSeat('0,0,-0.1 90 false')).toEqual(seat([0, 0, -0.1], 90));
    expect(parseFurnitureSeat('0,0,-0.1 90 up')).toBeNull();
    expect(parseFurnitureSeat('1,0.2,0')).toEqual(seat([1, 0.2, 0], null));
    expect(parseFurnitureSeat({ position: '0,1,0', yaw: 90 })).toEqual(seat([0, 1, 0], 90));
    expect(parseFurnitureSeat({ position: '0,1,0', yaw: 90, limit_player_rotation: false, force_player_rotation: true })).toEqual(
      seat([0, 1, 0], 90, { limitPlayerRotation: false, forcePlayerRotation: true }),
    );
    expect(parseFurnitureSeat('a,b')).toBeNull();
    expect(formatFurnitureSeat(seat([0, 0, -0.1], 0))).toBe('0,0,-0.1 0');
    expect(formatFurnitureSeat(seat([0, 0, -0.1], 90, { forcePlayerRotation: true }))).toBe('0,0,-0.1 90 true');
    expect(formatFurnitureSeat(seat([0, 0, -0.1], 90, { forcePlayerRotation: 45.5, limitPlayerRotation: true }))).toBe('0,0,-0.1 90 45.5');
    // The text form limits the body's rotation whenever it has a yaw, and has no turn without one
    expect(formatFurnitureSeat(seat([0, 0, 0], 90, { limitPlayerRotation: false, forcePlayerRotation: true }))).toEqual({
      position: '0,0,0',
      yaw: 90,
      limit_player_rotation: false,
      force_player_rotation: true,
    });
    expect(formatFurnitureSeat(seat([0, 0, 0], null, { limitPlayerRotation: true }))).toEqual({
      position: '0,0,0',
      limit_player_rotation: true,
    });
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

describe('furniture extras', () => {
  it('writes the display keys of elements after their transform, and leaves the placement extras empty', () => {
    const built = buildCraftEngineFurniture(
      {
        variants: {
          ground: {
            entity_culling: false,
            hitboxes: [{ invisible: true, can_use_item_on: false, position: '0,0,0', seats: ['0,0,0'] }],
            elements: [{ conditions: [{ type: 'permission' }], glow_color: '255,0,0', scale: 2, text: 'Hi', alignment: 'left' }],
            loot_spawn_offset: '0,0.5,0',
          },
        },
      },
      null,
      'm:sign',
    );
    const ground = (built.furniture.variants as Record<string, Record<string, unknown>>).ground;
    expect(Object.keys(ground)).toEqual(['loot_spawn_offset', 'elements', 'hitboxes', 'entity_culling']);
    expect(Object.keys((ground.elements as object[])[0])).toEqual(['type', 'text', 'scale', 'glow_color', 'alignment', 'conditions']);
    expect(Object.keys((ground.hitboxes as object[])[0])).toEqual(['type', 'position', 'invisible', 'can_use_item_on', 'seats']);
    expect(built.placementExtras).toEqual({});
  });

  it('writes the type of the hitboxes of behaviors, and leaves their other keys', () => {
    const built = buildCraftEngineFurniture(
      {
        variants: { ground: {} },
        behaviors: [
          {
            type: 'simple_storage_furniture',
            rows: 2,
            variants: { ground: { hitboxes: [{ width: 0.5, position: '0,0.5,0', peek: 3 }] } },
          },
          { type: 'glowing_furniture', lights: ['0,0.5,0 15'] },
        ],
      },
      null,
      'm:drawer',
    );
    expect(built.furniture.behaviors).toEqual([
      {
        type: 'simple_storage_furniture',
        rows: 2,
        variants: { ground: { hitboxes: [{ type: 'interaction', position: '0,0.5,0', width: 0.5 }] } },
      },
      { type: 'glowing_furniture', lights: ['0,0.5,0 15'] },
    ]);
    expect(Object.keys(built.furniture)).toEqual(['settings', 'variants', 'behaviors']);
  });

  it('shows a small armor stand at half its scale', () => {
    expect(furnitureElementPose({ type: 'armor_stand', small: true, scale: 2 }).scale).toEqual([1, 1, 1]);
    expect(furnitureElementPose({ type: 'armor_stand' }).scale).toEqual([1, 1, 1]);
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

describe('furniture entity culling', () => {
  // CraftEngine 26.9 (AbstractFurnitureManager) reads entity_culling from the furniture itself, for every variant
  it('writes the culling set on the furniture next to its variants', () => {
    const built = buildCraftEngineFurniture({ entity_culling: false, variants: { ground: {} } }, null, 'm:x');
    expect(Object.keys(built.furniture)).toEqual(['settings', 'variants', 'entity_culling']);
    expect(built.furniture.entity_culling).toBe(false);
  });

  it('also writes on the furniture the first culling a variant sets, and keeps it in the variant', () => {
    const built = buildCraftEngineFurniture({ variants: { ground: {}, wall: { entity_culling: { view_distance: 64 } } } }, null, 'm:x');
    expect(built.furniture.entity_culling).toEqual({ view_distance: 64 });
    expect((built.furniture.variants as Record<string, Record<string, unknown>>).wall.entity_culling).toEqual({ view_distance: 64 });
    const own = buildCraftEngineFurniture({ entity_culling: true, variants: { wall: { entity_culling: false } } }, null, 'm:x');
    expect(own.furniture.entity_culling).toBe(true);
  });
});

describe('glowing furniture lights', () => {
  it('reads lights written as text in the form the editor shows', () => {
    const behaviors = [
      { type: 'glowing_furniture', lights: ['0,0.5,0 12', '1,0,0', { position: '0,1,0' }, 'bad'], variants: { wall: ['0,0,0.2 7'] } },
      { type: 'simple_storage_furniture', variants: { ground: { hitboxes: [] } } },
    ];
    expect(withLightObjects(behaviors)).toEqual([
      {
        type: 'glowing_furniture',
        lights: [{ position: '0,0.5,0', level: 12 }, { position: '1,0,0' }, { position: '0,1,0' }, 'bad'],
        variants: { wall: [{ position: '0,0,0.2', level: 7 }] },
      },
      behaviors[1],
    ]);
    expect(withLightObjects(behaviors[0]).lights).toHaveLength(4);
    expect(withLightObjects(undefined)).toBeUndefined();
  });
});
