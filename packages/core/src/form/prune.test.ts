import { describe, expect, it } from 'vitest';
import { field, properties } from './build';
import { pruneValue } from './prune';

const [withEmptyValue, plain] = properties('main', {
  preview_placement: { field: field.object({ opacity: field.number() }, { emptyValue: true }), defaultValue: () => true },
  box: { field: field.object({ size: field.number() }), defaultValue: () => ({}) },
});

describe('pruneValue', () => {
  it('keeps `true` and writes it for an empty object whose field has an empty value', () => {
    expect(pruneValue(true, withEmptyValue.field)).toBe(true);
    expect(pruneValue({}, withEmptyValue.field)).toBe(true);
    expect(pruneValue({ opacity: 0.5 }, withEmptyValue.field)).toEqual({ opacity: 0.5 });
    expect(pruneValue(true, plain.field)).toBeUndefined();
  });
});
