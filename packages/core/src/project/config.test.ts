import { describe, expect, it } from 'vitest';
import { toConfigValue } from './config';

describe('toConfigValue', () => {
  it('keeps config data and drops keys without a value', () => {
    expect(toConfigValue({ a: 1, b: undefined, c: [true, undefined, 'x'], d: { e: null } })).toEqual({
      a: 1,
      c: [true, null, 'x'],
      d: { e: null },
    });
  });

  it('treats non-config data as not set', () => {
    expect(toConfigValue(undefined)).toBeUndefined();
    expect(toConfigValue(Number.NaN)).toBeUndefined();
    expect(toConfigValue(() => 1)).toBeUndefined();
  });
});
