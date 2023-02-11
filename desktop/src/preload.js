// @flow

// eslint-disable-next-line import/extensions
import { contextBridge, ipcRenderer } from 'electron/renderer';

import type { ElectronBridge } from 'lib/types/electron-types.js';

const bridge: ElectronBridge = {
  onNavigate: callback => {
    const withEvent = (event, ...args) => callback(...args);
    ipcRenderer.on('on-navigate', withEvent);
    return () => ipcRenderer.removeListener('on-navigate', withEvent);
  },
  clearHistory: () => ipcRenderer.send('clear-history'),
  doubleClickTopBar: () => ipcRenderer.send('double-click-top-bar'),
  setBadge: value => ipcRenderer.send('set-badge', value),
  version: ipcRenderer.sendSync('get-version'),
  onNewVersionAvailable: callback => {
    const withEvent = (event, ...args) => callback(...args);
    ipcRenderer.on('on-new-version-available', withEvent);
    return () =>
      ipcRenderer.removeListener('on-new-version-available', withEvent);
  },
  updateToNewVersion: () => ipcRenderer.send('update-to-new-version'),
};

contextBridge.exposeInMainWorld('electronContextBridge', bridge);
