// @flow

import {
  app,
  BrowserWindow,
  shell,
  Menu,
  ipcMain,
  systemPreferences,
  autoUpdater,
  // eslint-disable-next-line import/extensions
} from 'electron/main';
import fs from 'fs';
import path from 'path';

import { initAutoUpdate } from './auto-update.js';
import { handleSquirrelEvent } from './handle-squirrel-event.js';
import {
  listenForNotifications,
  registerForNotifications,
} from './push-notifications.js';

const isDev = process.env.ENV === 'dev';
const url = isDev ? 'http://localhost:3000/comm/' : 'https://web.comm.app';
const isMac = process.platform === 'darwin';

const scrollbarCSS = fs.promises.readFile(
  path.resolve(__dirname, '../scrollbar.css'),
  'utf8',
);

const setApplicationMenu = () => {
  let mainMenu = [];
  if (isMac) {
    mainMenu = [
      {
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
    ];
  }
  const viewMenu = {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
      { role: 'toggleDevTools' },
    ],
  };
  const windowMenu = {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      ...(isMac
        ? [
            { type: 'separator' },
            { role: 'front' },
            { type: 'separator' },
            { role: 'window' },
          ]
        : [{ role: 'close' }]),
    ],
  };

  const menu = Menu.buildFromTemplate([
    ...mainMenu,
    { role: 'fileMenu' },
    { role: 'editMenu' },
    viewMenu,
    windowMenu,
  ]);
  Menu.setApplicationMenu(menu);
};

let mainWindow = null;
const createMainWindow = (urlPath?: string) => {
  const win = new BrowserWindow({
    show: false,
    width: 1300,
    height: 800,
    minWidth: 1100,
    minHeight: 600,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 20, y: 24 },
    titleBarOverlay: {
      color: '#0A0A0A',
      symbolColor: '#FFFFFF',
      height: 64,
    },
    backgroundColor: '#0A0A0A',
    webPreferences: {
      preload: path.resolve(__dirname, 'preload.js'),
    },
  });

  const updateNavigationState = () => {
    win.webContents.send('on-navigate', {
      canGoBack: win.webContents.canGoBack(),
      canGoForward: win.webContents.canGoForward(),
    });
  };
  win.webContents.on('did-navigate-in-page', updateNavigationState);

  const clearHistory = () => {
    win.webContents.clearHistory();
    updateNavigationState();
  };
  ipcMain.on('clear-history', clearHistory);

  const doubleClickTopBar = () => {
    if (isMac) {
      // Possible values for AppleActionOnDoubleClick are Maximize,
      // Minimize or None. We handle the last two inside this if.
      // Maximize (which is the only behaviour for other platforms)
      // is handled in the later block.
      const action = systemPreferences.getUserDefault(
        'AppleActionOnDoubleClick',
        'string',
      );
      if (action === 'None') {
        return;
      } else if (action === 'Minimize') {
        win.minimize();
        return;
      }
    }

    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  };
  ipcMain.on('double-click-top-bar', doubleClickTopBar);

  const updateDownloaded = (event, releaseNotes, releaseName) => {
    win.webContents.send('on-new-version-available', releaseName);
  };
  autoUpdater.on('update-downloaded', updateDownloaded);

  win.on('closed', () => {
    mainWindow = null;
    ipcMain.removeListener('clear-history', clearHistory);
    ipcMain.removeListener('double-click-top-bar', doubleClickTopBar);
    autoUpdater.removeListener('update-downloaded', updateDownloaded);
  });

  win.webContents.setWindowOpenHandler(({ url: openURL }) => {
    shell.openExternal(openURL);
    // Returning 'deny' prevents a new electron window from being created
    return { action: 'deny' };
  });

  (async () => {
    const css = await scrollbarCSS;
    win.webContents.insertCSS(css);
  })();

  win.loadURL(url + (urlPath ?? ''));
  mainWindow = win;

  return win;
};

const createSplashWindow = () => {
  const win = new BrowserWindow({
    width: 300,
    height: 300,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    center: true,
    backgroundColor: '#111827',
  });
  win.loadFile(path.resolve(__dirname, '../pages/splash.html'));

  return win;
};

const createErrorWindow = () => {
  const win = new BrowserWindow({
    show: false,
    width: 400,
    height: 300,
    resizable: false,
    center: true,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 20, y: 24 },
    backgroundColor: '#111827',
  });
  win.on('close', () => {
    app.quit();
  });
  win.loadFile(path.resolve(__dirname, '../pages/error.html'));

  return win;
};

const show = (urlPath?: string) => {
  const splash = createSplashWindow();
  const error = createErrorWindow();
  const main = createMainWindow(urlPath);

  let loadedSuccessfully = true;
  main.webContents.on('did-fail-load', () => {
    loadedSuccessfully = false;
    if (!splash.isDestroyed()) {
      splash.destroy();
    }
    if (!error.isDestroyed()) {
      error.show();
    }

    setTimeout(() => {
      loadedSuccessfully = true;
      main.loadURL(url);
    }, 1000);
  });

  main.webContents.on('did-finish-load', () => {
    if (loadedSuccessfully) {
      if (!splash.isDestroyed()) {
        splash.destroy();
      }
      if (!error.isDestroyed()) {
        error.destroy();
      }

      main.show();

      if (app.isPackaged) {
        (async () => {
          const token = await registerForNotifications();
          main.webContents.send('on-device-token-registered', token);
        })();
      }
    }
  });
};

const run = () => {
  app.setName('Comm');
  setApplicationMenu();

  (async () => {
    await app.whenReady();

    if (app.isPackaged) {
      try {
        initAutoUpdate();
      } catch (error) {
        console.error(error);
      }
      listenForNotifications(threadID => {
        if (mainWindow) {
          mainWindow.webContents.send('on-notification-clicked', {
            threadID,
          });
        } else {
          show(`chat/thread/${threadID}/`);
        }
      });
    }

    ipcMain.on('set-badge', (event, value) => {
      if (isMac) {
        app.dock.setBadge(value?.toString() ?? '');
      }
    });
    ipcMain.on('get-version', event => {
      event.returnValue = app.getVersion().toString();
    });

    show();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        show();
      }
    });
  })();

  app.on('window-all-closed', () => {
    if (!isMac) {
      app.quit();
    }
  });
};

if (app.isPackaged && process.platform === 'win32') {
  if (!handleSquirrelEvent()) {
    run();
  }
} else {
  run();
}
