import { describe, expect, it } from 'vitest';
import { checkFieldValue } from './fieldSchema';
import type { Field } from './fields';

const number: Field = { type: 'number', key: 'amount', label: 'amount', integer: true, min: 1, max: 10 };
const select: Field = { type: 'select', key: 'mode', label: 'mode', options: [{ value: 'A' }, { value: 'B' }] };
const effect: Field = {
  type: 'object',
  key: 'effect',
  label: 'effect',
  fields: [number, select, { type: 'boolean', key: 'ambient', label: 'ambient' }],
};
const effects: Field = { type: 'map', key: 'effects', label: 'effects', keyLabel: 'key', value: effect, reservedKeys: ['other'] };
const list: Field = { type: 'objectList', key: 'list', label: 'list', itemLabel: 'entry', fields: [number] };

const field = (label: string) => ({ code: 'context.field', args: { field: { key: label } } });

describe('checkFieldValue', () => {
  it('reports ranges, wrong types and unknown options with frames from the value path', () => {
    const value = {
      speed: { amount: 20, mode: 'C', ambient: 'yes' },
      slow: { amount: 'abc', mode: 'A', ambient: 'true' },
      other: 'not checked',
    };
    expect(checkFieldValue(value, effects)).toEqual([
      {
        code: 'plan.fieldTooLarge',
        args: { value: 20, max: 10 },
        context: [{ code: 'context.mapKey', args: { key: 'speed' } }, field('amount')],
      },
      { code: 'plan.fieldNotAnOption', args: { value: 'C' }, context: [{ code: 'context.mapKey', args: { key: 'speed' } }, field('mode')] },
      {
        code: 'plan.fieldNotABoolean',
        args: { value: 'yes' },
        context: [{ code: 'context.mapKey', args: { key: 'speed' } }, field('ambient')],
      },
      {
        code: 'plan.fieldNotANumber',
        args: { value: 'abc' },
        context: [{ code: 'context.mapKey', args: { key: 'slow' } }, field('amount')],
      },
    ]);
  });

  it('names list entries and accepts unset and numeric text values', () => {
    expect(checkFieldValue([{ amount: 2.5 }, { amount: '3' }, { amount: '' }, 'x'], list)).toEqual([
      { code: 'plan.fieldNotInteger', context: [{ code: 'context.listEntry', args: { index: 1 } }, field('amount')] },
      { code: 'plan.fieldInvalidValue', context: [{ code: 'context.listEntry', args: { index: 4 } }] },
    ]);
    expect(checkFieldValue(undefined, number)).toEqual([]);
    expect(checkFieldValue(null, select)).toEqual([]);
  });
});
