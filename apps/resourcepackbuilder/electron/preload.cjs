// @ts-check
/**
 * Bridge between the UI and the desktop program, exposed as `window.resourcepackBuilder`. The UI only gets these
 * few functions (UI language, shared folders, local test server), no general file access.
 * Contract: `src/platform/desktopApi.ts`.
 */
const { contextBridge, ipcRenderer } = require('electron');

/** @typedef {import('../src/platform/desktopApi').DesktopApi} DesktopApi */
/** @typedef {import('../src/platform/desktopApi').DesktopInvokeChannels} DesktopInvokeChannels */
/** @typedef {import('../src/platform/desktopApi').DesktopEventChannels} DesktopEventChannels */

/** @type {<C extends keyof DesktopInvokeChannels>(channel: C, ...args: DesktopInvokeChannels[C]['args']) => Promise<DesktopInvokeChannels[C]['result']>} */
const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

/** @type {<C extends keyof DesktopEventChannels>(channel: C, callback: (payload: DesktopEventChannels[C]) => void) => () => void} */
const subscribe = (channel, callback) => {
  /** @param {Electron.IpcRendererEvent} _event @param {any} payload */
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

/** @type {DesktopApi} */
const api = {
  app: {
    setLocale: (locale) => invoke('app:set-locale', locale),
  },
  share: {
    chooseFolder: (purpose) => invoke('share:choose-folder', purpose),
    inspect: (folder) => invoke('share:inspect', folder),
    createSubfolder: (parent, name) => invoke('share:create-subfolder', parent, name),
    list: (folder) => invoke('share:list', folder),
    read: (folder, path) => invoke('share:read', folder, path),
    write: (folder, path, content) => invoke('share:write', folder, path, content),
    watch: (folder) => invoke('share:watch', folder),
    unwatch: (folder) => invoke('share:unwatch', folder),
    openFolder: (folder) => invoke('share:open-folder', folder),
    userName: () => invoke('share:user-name'),
    onChange: (callback) => subscribe('share:changed', callback),
  },
  testServer: {
    getState: () => invoke('testserver:get-state'),
    setConfig: (patch) => invoke('testserver:set-config', patch),
    versions: () => invoke('testserver:versions'),
    chooseNexoJar: () => invoke('testserver:choose-nexo-jar'),
    start: () => invoke('testserver:start'),
    stop: () => invoke('testserver:stop'),
    command: (command) => invoke('testserver:command', command),
    reload: () => invoke('testserver:reload'),
    sync: (files, options) => invoke('testserver:sync', files, options),
    readSettings: () => invoke('testserver:read-settings'),
    openFolder: () => invoke('testserver:open-folder'),
    clearLog: () => invoke('testserver:clear-log'),
    onEvent: (callback) => subscribe('testserver:event', callback),
  },
};

contextBridge.exposeInMainWorld('resourcepackBuilder', api);
