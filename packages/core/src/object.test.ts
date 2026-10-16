import { describe, expect, it } from 'vitest';
import { deepClone, forEachLeaf, groupBy, mapData, sameList } from './object';

describe('object helpers', () => {
  it('maps plain data bottom-up and drops undefined results', () => {
    const data = { a: [1, 'x', 2], b: { c: 'x' }, d: 'keep' };
    const noX = (v: unknown) => (v === 'x' ? undefined : v);
    expect(mapData(data, noX)).toEqual({ a: [1, 2], b: {}, d: 'keep' });
    expect(mapData(data, noX, { listHole: null })).toEqual({ a: [1, null, 2], b: {}, d: 'keep' });
    expect(mapData(data, noX, { dropEmpty: true })).toEqual({ a: [1, 2], d: 'keep' });
  });

  it('visits every leaf', () => {
    const leaves: unknown[] = [];
    forEachLeaf({ a: [1, { b: 'c' }], d: null }, (v) => leaves.push(v));
    expect(leaves).toEqual([1, 'c', null]);
  });

  it('groups in order and compares lists', () => {
    expect([...groupBy(['a1', 'b1', 'a2'], (v) => v[0])]).toEqual([
      ['a', ['a1', 'a2']],
      ['b', ['b1']],
    ]);
    expect(sameList(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(sameList([{ id: 'a' }], [{ id: 'a' }], (v) => v.id)).toBe(true);
    expect(sameList(['a'], ['a', 'b'])).toBe(false);
  });

  it('deep-clones plain data', () => {
    const value = { a: [1, { b: 2 }] };
    const copy = deepClone(value);
    expect(copy).toEqual(value);
    expect(copy.a).not.toBe(value.a);
  });
});
