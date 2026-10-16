import { describe, expect, it } from 'vitest';
import { commitsOnKey, pendingDraft } from './textDraft';

describe('pendingDraft', () => {
  it('keeps the draft while the value is the one it was typed over', () => {
    expect(pendingDraft({ text: 'sto', base: 'stone' }, 'stone')).toBe('sto');
    expect(pendingDraft({ text: 'x', base: undefined }, undefined)).toBe('x');
    expect(pendingDraft(null, 'stone')).toBeNull();
  });

  it('drops the draft when the value changes from outside (undo)', () => {
    expect(pendingDraft({ text: 'sto', base: 'stone' }, 'dirt')).toBeNull();
    expect(pendingDraft({ text: 'sto', base: 'stone' }, undefined)).toBeNull();
  });
});

describe('commitsOnKey', () => {
  it('commits a draft on Enter', () => {
    expect(commitsOnKey('Enter', 'sto', false)).toBe(true);
    expect(commitsOnKey('Enter', null, false)).toBe(false);
    expect(commitsOnKey('a', 'sto', false)).toBe(false);
  });

  it('leaves Enter on a highlighted suggestion to the pick', () => {
    expect(commitsOnKey('Enter', 'sto', true)).toBe(false);
  });
});
