import { describe, expect, it } from 'vitest';
import argumentMismatchDe from './fixtures/parity-argument-mismatch/de.json' with { type: 'json' };
import argumentMismatchEn from './fixtures/parity-argument-mismatch/en.json' with { type: 'json' };
import missingKeyDe from './fixtures/parity-missing-key/de.json' with { type: 'json' };
import missingKeyEn from './fixtures/parity-missing-key/en.json' with { type: 'json' };
import okDe from './fixtures/parity-ok/de.json' with { type: 'json' };
import okEn from './fixtures/parity-ok/en.json' with { type: 'json' };
import { assertMessageParity, messageParityErrors } from './parity';

describe('messageParityErrors', () => {
  it('reports no errors for catalogues with the same keys and ICU arguments', () => {
    expect(messageParityErrors(okEn, okDe)).toEqual([]);
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
    expect(messageParityErrors(english, german)).toEqual([
      { path: 'locked', reason: 'argument_mismatch' },
    ]);
  });
});

describe('assertMessageParity', () => {
  it('does not throw for catalogues in parity', () => {
    expect(() => {
      assertMessageParity(okEn, okDe);
    }).not.toThrow();
  });

  it('throws when a German key was removed', () => {
    expect(() => {
      assertMessageParity(missingKeyEn, missingKeyDe);
    }).toThrow(/greeting\.farewell/);
  });
});
