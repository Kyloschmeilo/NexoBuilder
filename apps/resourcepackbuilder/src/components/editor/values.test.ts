import { describe, expect, it } from 'vitest';
import type { Field } from '@resourcepackbuilder/core/nexo';
import {
  countSetValues,
  hexToNexoColor,
  insertAt,
  isFieldVisible,
  isWideField,
  moveInArray,
  nexoColorToHex,
  parseNumber,
  renameKey,
  toStringList,
  toggleSelection,
  unknownEntries,
  withKey,
  withUnknownEntries,
} from './values';

const text = (extra: Partial<Extract<Field, { type: 'text' }>> = {}): Field => ({ type: 'text', key: 'k', label: 'l', ...extra });

describe('isFieldVisible', () => {
  const field = text({ showIf: { key: 'mode', values: ['a', true] } });

  it('shows a field when its sibling has a listed value', () => {
    expect(isFieldVisible(field, { mode: 'a' })).toBe(true);
    expect(isFieldVisible(field, { mode: true })).toBe(true);
  });

  it('hides a field when the sibling has another value', () => {
    expect(isFieldVisible(field, { mode: 'b' })).toBe(false);
    expect(isFieldVisible(field, {})).toBe(false);
  });

  it('shows fields without a condition or without siblings', () => {
    expect(isFieldVisible(text(), { mode: 'b' })).toBe(true);
    expect(isFieldVisible(field, undefined)).toBe(true);
  });
});

describe('isWideField', () => {
  it('is wide for multiline text and lists, narrow for single-line text', () => {
    expect(isWideField(text({ multiline: true }))).toBe(true);
    expect(isWideField(text())).toBe(false);
    expect(isWideField({ type: 'stringList', key: 'k', label: 'l' })).toBe(true);
  });
});

describe('object helpers', () => {
  it('counts only keys that hold a value', () => {
    expect(countSetValues({ a: 1, b: '', c: null, d: undefined, e: false })).toBe(2);
    expect(countSetValues('nope')).toBe(0);
  });

  it('sets and removes keys without touching the input', () => {
    const obj = { a: 1 };
    expect(withKey(obj, 'b', 2)).toEqual({ a: 1, b: 2 });
    expect(withKey(obj, 'a', undefined)).toEqual({});
    expect(obj).toEqual({ a: 1 });
  });

  it('renames a key in place', () => {
    expect(Object.keys(renameKey({ a: 1, b: 2, c: 3 }, 'b', 'x'))).toEqual(['a', 'x', 'c']);
  });

  it('splits and replaces the unknown entries', () => {
    const known = new Set(['a']);
    expect(unknownEntries({ a: 1, b: 2 }, known)).toEqual({ b: 2 });
    expect(withUnknownEntries({ a: 1, b: 2 }, known, { c: 3 })).toEqual({ a: 1, c: 3 });
    expect(withUnknownEntries({ a: 1, b: 2 }, known, undefined)).toEqual({ a: 1 });
  });
});

describe('list helpers', () => {
  it('reads a single string as a one-entry list', () => {
    expect(toStringList('x')).toEqual(['x']);
    expect(toStringList(['a', 1, null])).toEqual(['a', '1', '']);
    expect(toStringList(undefined)).toEqual([]);
  });

  it('inserts and moves entries', () => {
    expect(insertAt(['a', 'c'], 1, 'b')).toEqual(['a', 'b', 'c']);
    expect(moveInArray(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('keeps the picking order of a multi-select', () => {
    expect(toggleSelection(['b'], ['a', 'b'])).toEqual(['b', 'a']);
    expect(toggleSelection(['b', 'a'], ['a'])).toEqual(['a']);
  });
});

describe('parseNumber', () => {
  it('parses decimals and integers', () => {
    expect(parseNumber(' 1.5 ')).toBe(1.5);
    expect(parseNumber('-3', true)).toBe(-3);
  });

  it('rejects partial input and fractions for integers', () => {
    expect(parseNumber('-')).toBeUndefined();
    expect(parseNumber('1.')).toBeUndefined();
    expect(parseNumber('1.5', true)).toBeUndefined();
    expect(parseNumber('')).toBeUndefined();
  });
});

describe('Nexo colours', () => {
  it('converts between "R, G, B" and hex', () => {
    expect(nexoColorToHex('255, 128, 0')).toBe('#ff8000');
    expect(nexoColorToHex('999, 0, 0')).toBe('#ff0000');
    expect(nexoColorToHex('red')).toBe('#ffffff');
    expect(hexToNexoColor('#ff8000')).toBe('255, 128, 0');
  });
});
