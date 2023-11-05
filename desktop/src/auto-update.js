// @flow

// eslint-disable-next-line import/extensions
import { app, ipcMain, autoUpdater } from 'electron/main';

const getUpdateURL = (version: string) =>
  `https://electron-update.commtechnologies.org/update/${process.platform}/${version}`;

export function initAutoUpdate(): void {
  autoUpdater.setFeedURL({ url: getUpdateURL(app.getVersion()) });

  // Check for new updates every 10 minutes
  const updateIntervalMs = 10 * 60_000;
  let currentTimeout: ?TimeoutID = null;
  const scheduleCheckForUpdates = () => {
    if (!currentTimeout) {
      currentTimeout = setTimeout(() => {
        currentTimeout = null;
        autoUpdater.checkForUpdates();
      }, updateIntervalMs);
    }
  };

  scheduleCheckForUpdates();

  autoUpdater.on('update-not-available', scheduleCheckForUpdates);

  autoUpdater.on('error', error => {
    console.error(error);
    scheduleCheckForUpdates();
  });

  ipcMain.on('update-to-new-version', () => autoUpdater.quitAndInstall());
}
