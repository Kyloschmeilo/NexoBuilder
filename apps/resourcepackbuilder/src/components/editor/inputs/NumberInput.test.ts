import { describe, expect, it } from 'vitest';
import { steppedNumber } from './NumberInput';

describe('steppedNumber', () => {
  it('steps by the field step without float noise and stays in range', () => {
    expect(steppedNumber(0.2, 1, 0.1)).toBe(0.3);
    expect(steppedNumber(1, -1, 0.05)).toBe(0.95);
    expect(steppedNumber(5, 1)).toBe(6);
    expect(steppedNumber(0, -1, 1, 0)).toBe(0);
    expect(steppedNumber(15, 1, 1, 0, 15)).toBe(15);
  });
});
