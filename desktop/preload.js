// @noflow

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronContextBridge', {
  onNavigate: callback => ipcRenderer.on('on-navigate', callback),
  setBadge: value => ipcRenderer.send('set-badge', value),
});
