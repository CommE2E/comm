const { contextBridge, ipcRenderer } = require('electron');

const bridge = {
  onNavigate: callback => ipcRenderer.on('on-navigate', callback),
  setBadge: value => ipcRenderer.send('set-badge', value),
  onTopBarDoubleClick: () => ipcRenderer.send('on-top-bar-double-click'),
};

contextBridge.exposeInMainWorld('electronContextBridge', bridge);
