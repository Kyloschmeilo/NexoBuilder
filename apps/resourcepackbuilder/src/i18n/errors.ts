import { CoreError } from '@resourcepackbuilder/core/errors';
import { translator } from './locale';

/**
 * The user-facing text of a caught error in the current language: a {@link CoreError} is translated
 * from the `issues` namespace, anything else falls back to its own message.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof CoreError) {
    // The code is a runtime key; parity tests keep every code core throws present in the catalogue.
    return translator('issues')(err.code as never, err.params as never);
  }
  return err instanceof Error ? err.message : String(err);
}
