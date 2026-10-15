// @ts-check
/** Typed IPC registration for the channels of the shared contract (`src/platform/desktopApi.ts`). */
const { ipcMain } = require('electron');

/** @typedef {import('../src/platform/desktopApi').DesktopInvokeChannels} DesktopInvokeChannels */
/** @typedef {import('../src/platform/desktopApi').DesktopEventChannels} DesktopEventChannels */

const APP_ORIGIN = 'app://bundle';

/**
 * Registers `fn` for an invoke channel. Requests from anything but the app's own UI (`app://bundle/`) are rejected.
 * The arguments are typed by the contract but come from the renderer, so handlers still validate them.
 *
 * @template {keyof DesktopInvokeChannels} C
 * @param {C} channel
 * @param {(event: Electron.IpcMainInvokeEvent, ...args: DesktopInvokeChannels[C]['args']) =>
 *   DesktopInvokeChannels[C]['result'] | Promise<DesktopInvokeChannels[C]['result']>} fn
 */
function handle(channel, fn) {
  ipcMain.handle(channel, (event, ...args) => {
    const url = event.senderFrame?.url ?? '';
    if (!url.startsWith(`${APP_ORIGIN}/`)) throw new Error('Not allowed');
    return fn(event, .../** @type {DesktopInvokeChannels[C]['args']} */ (args));
  });
}

/**
 * Sends an event to one renderer, unless it is gone.
 *
 * @template {keyof DesktopEventChannels} C
 * @param {Electron.WebContents} target
 * @param {C} channel
 * @param {DesktopEventChannels[C]} payload
 */
function send(target, channel, payload) {
  if (!target.isDestroyed()) target.send(channel, payload);
}

module.exports = { APP_ORIGIN, handle, send };
