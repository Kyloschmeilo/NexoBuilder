/**
 * Bridge between the UI and the desktop program, exposed as `window.resourcepackBuilder`. The UI only gets the methods
 * listed in the contract (`DESKTOP_API`: UI language, shared folders, local test server), no general file access.
 *
 * Every invoke answers with an outcome; a failure is rejected as the plain `{ code, args }` payload (custom error
 * properties would not survive the context bridge) and turned back into a `DesktopError` by `src/platform/desktop.ts`.
 */
import { DESKTOP_API, type DesktopApi, type InvokeOutcome } from '@resourcepackbuilder/desktop-contract';
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

async function invoke(channel: string, args: unknown[]): Promise<unknown> {
  const outcome = (await ipcRenderer.invoke(channel, ...args)) as InvokeOutcome<unknown>;
  if (outcome.ok) return outcome.value;
  throw outcome.error;
}

function subscribe(channel: string, callback: (payload: unknown) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: unknown) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api = Object.fromEntries(
  Object.entries(DESKTOP_API).map(([group, methods]) => [
    group,
    Object.fromEntries(
      Object.entries(methods).map(([name, def]) => [
        name,
        def.kind === 'invoke'
          ? (...args: unknown[]) => invoke(def.channel, args)
          : (callback: (payload: unknown) => void) => subscribe(def.channel, callback),
      ]),
    ),
  ]),
) as DesktopApi;

contextBridge.exposeInMainWorld('resourcepackBuilder', api);
