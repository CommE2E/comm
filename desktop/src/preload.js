// @flow

import type { IpcRendererEvent } from 'electron';
// eslint-disable-next-line import/extensions
import { contextBridge, ipcRenderer } from 'electron/renderer';

import type { ElectronBridge } from 'lib/types/electron-types.js';

const bridge: ElectronBridge = {
  onNavigate: callback => {
    const withEvent = (event: IpcRendererEvent, ...args: $ReadOnlyArray<any>) =>
      callback(...args);
    ipcRenderer.on('on-navigate', withEvent);
    return () => ipcRenderer.removeListener('on-navigate', withEvent);
  },
  clearHistory: () => ipcRenderer.send('clear-history'),
  doubleClickTopBar: () => ipcRenderer.send('double-click-top-bar'),
  setBadge: value => ipcRenderer.send('set-badge', value),
  version: ipcRenderer.sendSync('get-version'),
  onNewVersionAvailable: callback => {
    const withEvent = (event: IpcRendererEvent, ...args: $ReadOnlyArray<any>) =>
      callback(...args);
    ipcRenderer.on('on-new-version-available', withEvent);
    return () =>
      ipcRenderer.removeListener('on-new-version-available', withEvent);
  },
  updateToNewVersion: () => ipcRenderer.send('update-to-new-version'),
  platform: (
    { win32: 'windows', darwin: 'macos' } as Partial<
      Record<typeof process.platform, 'windows' | 'macos'>,
    >
  )[process.platform],
  onDeviceTokenRegistered: callback => {
    const withEvent = (event: IpcRendererEvent, ...args: $ReadOnlyArray<any>) =>
      callback(...args);
    ipcRenderer.on('on-device-token-registered', withEvent);
    return () =>
      ipcRenderer.removeListener('on-device-token-registered', withEvent);
  },
  onNotificationClicked: callback => {
    const withEvent = (event: IpcRendererEvent, ...args: $ReadOnlyArray<any>) =>
      callback(...args);
    ipcRenderer.on('on-notification-clicked', withEvent);
    return () =>
      ipcRenderer.removeListener('on-notification-clicked', withEvent);
  },
  fetchDeviceToken: () => ipcRenderer.send('fetch-device-token'),
  onEncryptedNotification: callback => {
    const withEvent = (
      event: IpcRendererEvent,
      ...args: $ReadOnlyArray<any>
    ) => {
      callback(...args);
    };
    ipcRenderer.on('on-encrypted-notification', withEvent);
    return () =>
      ipcRenderer.removeListener('on-encrypted-notification', withEvent);
  },
  showDecryptedNotification: decryptedPayload =>
    ipcRenderer.send('show-decrypted-notification', decryptedPayload),
};

contextBridge.exposeInMainWorld('electronContextBridge', bridge);
