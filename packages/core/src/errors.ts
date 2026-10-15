/** Parameters interpolated into a translated message. */
export type MessageParams = Record<string, string | number>;

/**
 * An error whose user-facing text lives in the `issues` message namespace instead of in core,
 * so the app can show it in the current language. `code` is the message key inside `issues`.
 */
export class CoreError extends Error {
  constructor(
    readonly code: string,
    readonly params: MessageParams = {},
  ) {
    super(code);
    this.name = 'CoreError';
  }
}
