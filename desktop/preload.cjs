const { contextBridge, ipcRenderer } = require('electron');

const bridge = {
  onNavigate: callback => {
    const withEvent = (event, ...args) => callback(...args);
    ipcRenderer.on('on-navigate', withEvent);
    return () => ipcRenderer.removeListener('on-navigate', withEvent);
  },
  clearHistory: () => ipcRenderer.send('clear-history'),
};

contextBridge.exposeInMainWorld('electronContextBridge', bridge);
