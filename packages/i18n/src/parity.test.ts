import { describe, expect, it } from 'vitest';
import argumentMismatchDe from './fixtures/argumentMismatch/de.json' with { type: 'json' };
import argumentMismatchEn from './fixtures/argumentMismatch/en.json' with { type: 'json' };
import missingKeyDe from './fixtures/missingKey/de.json' with { type: 'json' };
import missingKeyEn from './fixtures/missingKey/en.json' with { type: 'json' };
import matchingDe from './fixtures/matching/de.json' with { type: 'json' };
import matchingEn from './fixtures/matching/en.json' with { type: 'json' };
import { messageParityErrors } from './parity';

describe('messageParityErrors', () => {
  it('reports no errors for catalogues with the same keys and ICU arguments', () => {
    expect(messageParityErrors(matchingEn, matchingDe)).toEqual([]);
  });

  it('reports a missing key when a German key was removed', () => {
    const errors = messageParityErrors(missingKeyEn, missingKeyDe);
    expect(errors).toEqual([{ path: 'greeting.farewell', reason: 'missing_in_target' }]);
  });

  it('reports an argument mismatch when the ICU arguments differ', () => {
    const errors = messageParityErrors(argumentMismatchEn, argumentMismatchDe);
    expect(errors).toEqual([{ path: 'greeting.hello', reason: 'argument_mismatch' }]);
  });

  it('ignores the text of plural branches when comparing arguments', () => {
    const english = { locked: '{count, plural, one {Locked after # PIN} other {Locked {when}}}' };
    const german = { locked: '{count, plural, one {Gesperrt nach # PIN} other {Gesperrt {when}}}' };
    expect(messageParityErrors(english, german)).toEqual([]);
  });

  it('reports an argument missing inside a plural branch', () => {
    const english = { locked: '{count, plural, other {Locked {when}}}' };
    const german = { locked: '{count, plural, other {Gesperrt}}' };
    expect(messageParityErrors(english, german)).toEqual([{ path: 'locked', reason: 'argument_mismatch' }]);
  });

  it('reads arguments after words that are plural selectors elsewhere', () => {
    const english = { moved: 'Moved the other {count} items to {folder}' };
    const german = { moved: 'Die anderen Einträge wurden nach {folder} verschoben' };
    expect(messageParityErrors(english, german)).toEqual([{ path: 'moved', reason: 'argument_mismatch' }]);
  });

  it('takes no branch text of a select or a quoted brace for an argument', () => {
    const english = { kind: "{kind, select, item {an item} other {other}} '{'raw'}' {name}" };
    const german = { kind: "{kind, select, item {ein Item} other {anderes}} '{'roh'}' {name}" };
    expect(messageParityErrors(english, german)).toEqual([]);
  });
});
