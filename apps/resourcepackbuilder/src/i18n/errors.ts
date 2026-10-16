import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { CoreError, type IssueCode, type MessageArgs } from '@resourcepackbuilder/utils';
import { DesktopError } from '@resourcepackbuilder/desktop-contract/errors';
import type { MessageKey } from '@resourcepackbuilder/i18n';
import { useSchemaText } from '../components/useSchemaText';

/** Codes of the app's own errors: the messages under `errors` in the `app` namespace. */
export type AppErrorCode = Extract<MessageKey<'app'>, `errors.${string}`>;

/** An error of the app (not of core) whose user-facing text is the message `code` in the `app` namespace. */
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
 * Returns the function that renders a message of core in the current language: `code` from the `issues` namespace
 * with its `args`, where label args (`{ key, args }`) are translated first like any text of core's data (see
 * {@link useSchemaText}). Used for issues, their context frames and {@link CoreError}s alike.
 */
export function useRenderMessage(): (code: IssueCode, args?: MessageArgs) => string {
  const tIssues = useTranslations('issues');
  const tSchema = useSchemaText();
  return useCallback(
    (code: IssueCode, args: MessageArgs = {}) => {
      const values: Record<string, string | number> = {};
      for (const [name, arg] of Object.entries(args)) values[name] = typeof arg === 'object' ? tSchema(arg.key, arg.args) : arg;
      return tIssues(code, values);
    },
    [tIssues, tSchema],
  );
}

/**
 * Returns the function that words a caught error in the current language: {@link CoreError}s from the `issues`
 * namespace, {@link AppError}s from `app`, {@link DesktopError}s (reported by the desktop program) from
 * `desktopErrors`, anything else by its own message.
 */
export function useErrorMessage(): (err: unknown) => string {
  const render = useRenderMessage();
  const tApp = useTranslations('app');
  const tDesktop = useTranslations('desktopErrors');
  return useCallback(
    (err: unknown) => {
      if (err instanceof CoreError) return render(err.code, err.args);
      if (err instanceof AppError) return tApp(err.code, err.args);
      if (err instanceof DesktopError) return tDesktop(err.code, err.args);
      return err instanceof Error ? err.message : String(err);
    },
    [render, tApp, tDesktop],
  );
}
