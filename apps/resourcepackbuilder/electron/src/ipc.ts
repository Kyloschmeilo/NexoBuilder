/** IPC registration for the channels of the shared contract (`@resourcepackbuilder/desktop-contract`). */
import {
  DesktopError,
  isAppUrl,
  toDesktopErrorPayload,
  type DesktopEventChannel,
  type DesktopEventPayload,
  type DesktopInvokeArgs,
  type DesktopInvokeChannel,
  type DesktopInvokeResult,
  type InvokeOutcome,
} from '@resourcepackbuilder/desktop-contract';
import { invokeSchemas } from '@resourcepackbuilder/desktop-contract/schemas';
import { ipcMain, type IpcMainInvokeEvent, type WebContents } from 'electron';

export type Handler<C extends DesktopInvokeChannel> = (
  event: IpcMainInvokeEvent,
  ...args: DesktopInvokeArgs<C>
) => DesktopInvokeResult<C> | Promise<DesktopInvokeResult<C>>;

/**
 * Registers `fn` for an invoke channel. Requests from anything but the app's own UI are refused, and the arguments
 * are checked against the channel's schema before `fn` sees them. The answer is an {@link InvokeOutcome}: errors are
 * sent as a code plus arguments, which the preload script turns back into a `DesktopError` for the UI.
 */
export function handle<C extends DesktopInvokeChannel>(channel: C, fn: Handler<C>): void {
  ipcMain.handle(channel, async (event, ...raw: unknown[]): Promise<InvokeOutcome<DesktopInvokeResult<C>>> => {
    try {
      if (!isAppUrl(event.senderFrame?.url ?? '')) throw new DesktopError('notAllowed');
      const parsed = invokeSchemas[channel].safeParse(raw);
      if (!parsed.success) {
        console.warn(`Invalid arguments for ${channel}:`, parsed.error.issues);
        throw new DesktopError('invalidArguments', { channel });
      }
      return { ok: true, value: await fn(event, ...(parsed.data as DesktopInvokeArgs<C>)) };
    } catch (err) {
      if (!(err instanceof DesktopError)) console.error(`${channel} failed`, err);
      return { ok: false, error: toDesktopErrorPayload(err) };
    }
  });
}

/** Sends an event to one renderer, unless it is gone. */
export function send<C extends DesktopEventChannel>(target: WebContents, channel: C, payload: DesktopEventPayload<C>): void {
  if (!target.isDestroyed()) target.send(channel, payload);
}
