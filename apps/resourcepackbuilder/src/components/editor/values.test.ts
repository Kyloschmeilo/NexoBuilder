import { describe, expect, it } from 'vitest';
import type { Field } from '@resourcepackbuilder/core/form';
import {
  arrangeObjectFields,
  choiceControl,
  countSetValues,
  formatVector,
  hexToNexoColor,
  insertAt,
  isFieldVisible,
  isWideField,
  moveInArray,
  nexoColorToHex,
  parseNumber,
  parseVector,
  renameKey,
  toStringList,
  toggleSelection,
  typeParts,
  unknownEntries,
  withKey,
  withEntryType,
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

describe('typed entries', () => {
  const command = { type: 'command', label: '', fields: [text({ key: 'command' }), text({ key: 'conditions' })] };

  it('splits the "!" off an invertible type', () => {
    expect(typeParts('!permission', true)).toEqual({ name: 'permission', inverted: true });
    expect(typeParts('!permission')).toEqual({ name: '!permission', inverted: false });
    expect(typeParts(undefined, true)).toEqual({ name: '', inverted: false });
  });

  it('keeps the keys the new type has, and every key while the type is unknown', () => {
    const entry = { type: 'message', message: 'hi', conditions: [] };
    expect(withEntryType(entry, 'command', command)).toEqual({ type: 'command', conditions: [] });
    expect(withEntryType(entry, 'comm', undefined)).toEqual({ type: 'comm', message: 'hi', conditions: [] });
    expect(withEntryType(entry, '', undefined)).toEqual({ message: 'hi', conditions: [] });
  });
});

describe('arrangeObjectFields', () => {
  it('puts simple fields before wide ones and keeps advanced fields apart, each in schema order', () => {
    const fields: Field[] = [
      { type: 'stringList', key: 'list', label: 'l' },
      text({ key: 'a' }),
      text({ key: 'rare', advanced: true }),
      { type: 'yaml', key: 'raw', label: 'l', advanced: true },
      text({ key: 'b' }),
      text({ key: 'rarer', advanced: true }),
    ];
    const { common, advanced } = arrangeObjectFields(fields);
    expect(common.map((f) => f.key)).toEqual(['a', 'b', 'list']);
    expect(advanced.map((f) => f.key)).toEqual(['rare', 'rarer', 'raw']);
  });
});

describe('arrangeObjectFields heuristic', () => {
  const bool = (key: string, defaultHint?: boolean, advanced?: boolean): Field => ({
    type: 'boolean',
    key,
    label: 'l',
    defaultHint,
    advanced,
  });

  it('tucks booleans with a plugin default away in objects of five or more fields', () => {
    const fields = [text({ key: 'a' }), text({ key: 'b' }), bool('c', true), bool('d'), bool('e', false)];
    const { common, advanced } = arrangeObjectFields(fields);
    expect(common.map((f) => f.key)).toEqual(['a', 'b', 'd']);
    expect(advanced.map((f) => f.key)).toEqual(['c', 'e']);
  });

  it('leaves small objects and fields marked advanced: false alone', () => {
    expect(arrangeObjectFields([text({ key: 'a' }), bool('c', true)]).advanced).toEqual([]);
    const fields = [text({ key: 'a' }), text({ key: 'b' }), bool('c', true, false), bool('d', true), text({ key: 'e' })];
    expect(arrangeObjectFields(fields).advanced.map((f) => f.key)).toEqual(['d']);
  });

  it('keeps at least two common fields, falling back to the flags alone', () => {
    const fields = [text({ key: 'a' }), bool('b', true), bool('c', true), bool('d', true), bool('e', true, true)];
    const { common, advanced } = arrangeObjectFields(fields);
    expect(common.map((f) => f.key)).toEqual(['a', 'b', 'c', 'd']);
    expect(advanced.map((f) => f.key)).toEqual(['e']);
  });
});

describe('choiceControl', () => {
  it('picks segments up to 4 options, a select up to 12 and a combobox above', () => {
    expect([1, 4, 5, 12, 13, 200].map(choiceControl)).toEqual(['segmented', 'segmented', 'select', 'select', 'combobox', 'combobox']);
  });
});

describe('vectors', () => {
  it('splits "x,y,z" text, empty values and rejects other text', () => {
    expect(parseVector('0, 0.5,-1')).toEqual(['0', '0.5', '-1']);
    expect(parseVector(undefined)).toEqual(['', '', '']);
    expect(parseVector('')).toEqual(['', '', '']);
    expect(parseVector('1 2 3')).toBeUndefined();
    expect(parseVector('<random>')).toBeUndefined();
    expect(parseVector(3)).toBeUndefined();
  });

  it('writes a vector only once all three parts are numbers', () => {
    expect(formatVector(['0', '0.50', '-1'])).toBe('0,0.5,-1');
    expect(formatVector(['1,5', '2', '3'])).toBe('1.5,2,3');
    expect(formatVector(['1', '', '3'])).toBeNull();
    expect(formatVector(['1', '-', '3'])).toBeNull();
    expect(formatVector(['', ' ', ''])).toBeUndefined();
  });
});
