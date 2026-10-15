/**
 * Brücke zwischen Oberfläche und Desktop-Programm. Die Oberfläche bekommt nur diese wenigen
 * Funktionen (geteilte Ordner, lokaler Testserver) – keinen allgemeinen Dateizugriff.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexoDesktop', {
  share: {
    chooseFolder: (purpose) => ipcRenderer.invoke('share:choose-folder', purpose),
    inspect: (folder) => ipcRenderer.invoke('share:inspect', folder),
    createSubfolder: (parent, name) => ipcRenderer.invoke('share:create-subfolder', parent, name),
    list: (folder) => ipcRenderer.invoke('share:list', folder),
    read: (folder, path) => ipcRenderer.invoke('share:read', folder, path),
    write: (folder, path, content) => ipcRenderer.invoke('share:write', folder, path, content),
    watch: (folder) => ipcRenderer.invoke('share:watch', folder),
    unwatch: (folder) => ipcRenderer.invoke('share:unwatch', folder),
    openFolder: (folder) => ipcRenderer.invoke('share:open-folder', folder),
    userName: () => ipcRenderer.invoke('share:user-name'),
    onChange: (callback) => {
      const listener = (_event, folder) => callback(folder);
      ipcRenderer.on('share:changed', listener);
      return () => ipcRenderer.removeListener('share:changed', listener);
    },
  },
  testServer: {
    getState: () => ipcRenderer.invoke('testserver:get-state'),
    setConfig: (patch) => ipcRenderer.invoke('testserver:set-config', patch),
    versions: () => ipcRenderer.invoke('testserver:versions'),
    chooseNexoJar: () => ipcRenderer.invoke('testserver:choose-nexo-jar'),
    start: () => ipcRenderer.invoke('testserver:start'),
    stop: () => ipcRenderer.invoke('testserver:stop'),
    command: (command) => ipcRenderer.invoke('testserver:command', command),
    reload: () => ipcRenderer.invoke('testserver:reload'),
    sync: (files, options) => ipcRenderer.invoke('testserver:sync', files, options),
    readSettings: () => ipcRenderer.invoke('testserver:read-settings'),
    openFolder: () => ipcRenderer.invoke('testserver:open-folder'),
    clearLog: () => ipcRenderer.invoke('testserver:clear-log'),
    onEvent: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on('testserver:event', listener);
      return () => ipcRenderer.removeListener('testserver:event', listener);
    },
  },
});
