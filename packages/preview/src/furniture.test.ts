import { describe, expect, it } from 'vitest';
import { furnitureElementMatrix, type FurnitureElementTransform, furniturePoint } from './furniture';

const IDENTITY: FurnitureElementTransform = {
  position: [0, 0, 0],
  translation: [0, 0, 0],
  scale: [1, 1, 1],
  rotation: [0, 0, 0, 1],
  yaw: 0,
  pitch: 0,
  flip: true,
};

/** Where the matrix puts a point (column-major 4×4). */
function apply(m: number[], [x, y, z]: [number, number, number]): number[] {
  return [0, 1, 2].map((r) => m[r] * x + m[4 + r] * y + m[8 + r] * z + m[12 + r]);
}

const close = (actual: number[], expected: number[]) => actual.forEach((n, i) => expect(n).toBeCloseTo(expected[i], 5));

describe('furniture element transforms', () => {
  it('shows an item display as its model when nothing is set (yaw 180 and the half turn cancel out)', () => {
    close(furnitureElementMatrix(IDENTITY), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  });

  it('places the bench: position mirrored in z, translation turned with the entity', () => {
    const m = furnitureElementMatrix({ ...IDENTITY, position: [0.5, 0, 0.25], translation: [0, 0.5, 0] });
    close(apply(m, [0, 0, 0]), [8, 8, -4]);
    // The model is not turned
    close(apply(m, [1, 0, 0]), [9, 8, -4]);
    // A translation along x points the other way than a position (the entity faces north)
    close(apply(furnitureElementMatrix({ ...IDENTITY, translation: [1, 0, 0] }), [0, 0, 0]), [-16, 0, 0]);
  });

  it('scales, rotates and turns the element', () => {
    const s = Math.SQRT1_2;
    // Scale 2 and a quarter turn around y (the rotation 0,90,0)
    const m = furnitureElementMatrix({ ...IDENTITY, scale: [2, 2, 2], rotation: [0, s, 0, s] });
    close(apply(m, [1, 0, 0]), [0, 0, -2]);
    // The element's own yaw turns it the other way round the vertical axis
    close(apply(furnitureElementMatrix({ ...IDENTITY, yaw: 90 }), [1, 0, 0]), [0, 0, 1]);
    // Without the half turn (other display types) the model faces the entity's way
    close(apply(furnitureElementMatrix({ ...IDENTITY, flip: false }), [1, 0, 0]), [-1, 0, 0]);
  });

  it('maps furniture points to the scene', () => {
    expect(furniturePoint([1, 0.5, -0.1])).toEqual([16, 8, 1.6]);
  });
});
