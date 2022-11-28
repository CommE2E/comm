import { contextBridge, ipcRenderer } from 'electron';

const bridge = {
  onNavigate: callback => {
    const withEvent = (event, ...args) => callback(...args);
    ipcRenderer.on('on-navigate', withEvent);
    return () => ipcRenderer.removeListener('on-navigate', withEvent);
  },
  clearHistory: () => ipcRenderer.send('clear-history'),
  doubleClickTopBar: () => ipcRenderer.send('double-click-top-bar'),
  setBadge: value => ipcRenderer.send('set-badge', value),
};

contextBridge.exposeInMainWorld('electronContextBridge', bridge);
