// @flow

import { app, ipcMain, autoUpdater } from 'electron/main';

const getUpdateUrl = version =>
  `https://electron-update.commtechnologies.org/update/${process.platform}/${version}`;

export function initAutoUpdate(): void {
  autoUpdater.setFeedURL({ url: getUpdateUrl(app.getVersion()) });

  // Check for new updates every 5 minutes
  const updateInterval = 300_000;
  setInterval(() => autoUpdater.checkForUpdates(), updateInterval);

  autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    autoUpdater.setFeedURL({ url: getUpdateUrl(releaseName) });
  });

  ipcMain.on('update-to-new-version', () => autoUpdater.quitAndInstall());
}
