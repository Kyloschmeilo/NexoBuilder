import { describe, expect, it } from 'vitest';
import {
  buildCraftEngineFurniture,
  formatFurnitureSeat,
  furnitureElementPose,
  furnitureHitboxBox,
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
      variants: { ground: { elements: [{ type: 'item_display', item: 'm:chair', position: '0,0.5,0' }], hitboxes: [{ type: 'interaction' }] } },
    });
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
    // A fully open shulker reaches one more block towards its direction
    const shulker = furnitureHitboxBox({ type: 'shulker', position: '0,0,0', direction: 'east', peek: 100 });
    close(shulker.min, [-0.5, 0, -0.5]);
    close(shulker.max, [1.5, 1, 0.5]);
  });
});
