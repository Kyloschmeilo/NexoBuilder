/**
 * A caught value as an `Error`, so stores keep a typed error. Errors (`DesktopError`, `CoreError`, `AppError` …) stay
 * as they are – `useErrorMessage` words them by their code; anything else is wrapped with its text.
 */
export function asError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}
