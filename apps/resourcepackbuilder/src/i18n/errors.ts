import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { CoreError } from '@resourcepackbuilder/core/issues';
import type { MessageKey } from '@resourcepackbuilder/i18n';

/** Codes of the app's own errors: messages in the `state` namespace. */
export type AppErrorCode = MessageKey<'app'>;

/** An error of the app (not of core) whose user-facing text is the message `code` in the `state` namespace. */
export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    readonly args: Record<string, string | number> = {},
  ) {
    super(code);
    this.name = 'AppError';
  }
}

/**
 * Returns the function that words a caught error in the current language: {@link CoreError}s from the `issues`
 * namespace, {@link AppError}s from `state`, anything else by its own message.
 */
export function useErrorMessage(): (err: unknown) => string {
  const tIssues = useTranslations('issues');
  const tSchema = useTranslations('schema');
  const tApp = useTranslations('app');
  return useCallback(
    (err: unknown) => {
      if (err instanceof CoreError) {
        const values: Record<string, string | number> = {};
        for (const [name, arg] of Object.entries(err.args)) {
          // Label keys and codes are runtime keys; core's tests keep every one of them in the catalogues.
          values[name] = typeof arg === 'object' ? tSchema(arg.key as never, (arg.args ?? {}) as never) : arg;
        }
        return tIssues(err.code as never, values as never);
      }
      if (err instanceof AppError) return tApp(err.code, err.args as never);
      return err instanceof Error ? err.message : String(err);
    },
    [tIssues, tSchema, tApp],
  );
}
