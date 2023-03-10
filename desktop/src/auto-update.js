// @flow

// eslint-disable-next-line import/extensions
import { app, ipcMain, autoUpdater } from 'electron/main';

const getUpdateUrl = version =>
  `https://electron-update.commtechnologies.org/update/${process.platform}/${version}`;

export function initAutoUpdate(): void {
  autoUpdater.setFeedURL({ url: getUpdateUrl(app.getVersion()) });

  // Check for new updates every 10 minutes
  const updateIntervalMs = 10 * 60_000;
  const scheduleCheckForUpdates = () => {
    setTimeout(() => autoUpdater.checkForUpdates(), updateIntervalMs);
  };

  scheduleCheckForUpdates();

  autoUpdater.on('update-not-available', scheduleCheckForUpdates);

  autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    autoUpdater.setFeedURL({ url: getUpdateUrl(releaseName) });
    scheduleCheckForUpdates();
  });

  autoUpdater.on('error', error => {
    console.error(error);
    scheduleCheckForUpdates();
  });

  ipcMain.on('update-to-new-version', () => autoUpdater.quitAndInstall());
}
