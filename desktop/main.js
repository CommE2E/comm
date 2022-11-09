// @noflow
const { app, BrowserWindow, shell, Menu, ipcMain } = require('electron');
const path = require('path');

const isDev = process.env.ENV === 'dev';
const URL = isDev ? 'http://localhost/comm/' : 'https://web.comm.app';
const isMac = process.platform === 'darwin';

const insertCSS = `
::-webkit-scrollbar {
  width: 15px;
}
::-webkit-scrollbar-track-piece {
  background-color: var(--shades-black-80);
}
::-webkit-scrollbar-thumb {
  background-color: var(--shades-black-60);
  border: 3px var(--shades-black-80) solid;
  border-radius: 10px;
}`;

const createMainWindow = () => {
  const win = new BrowserWindow({
    show: false,
    width: 1300,
    height: 800,
    minWidth: 1100,
    minHeight: 600,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 20, y: 24 },
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      devTools: isDev,
    },
  });

  win.webContents.on('did-navigate-in-page', () => {
    win.webContents.send('on-navigate', {
      canGoBack: win.webContents.canGoBack(),
      canGoForward: win.webContents.canGoForward(),
    });
  });

  ipcMain.on('set-badge', (event, value) => {
    if (value) {
      app.dock.setBadge(value.toString());
    } else {
      app.dock.setBadge('');
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.loadURL(URL);
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
    webPreferences: {
      sandbox: true,
      devTools: isDev,
    },
  });
  win.loadFile(`${__dirname}/pages/splash.html`);

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
    webPreferences: {
      sandbox: true,
      devTools: isDev,
    },
  });
  win.on('close', () => {
    app.quit();
  });
  win.loadFile(`${__dirname}/pages/error.html`);

  return win;
};

const show = () => {
  const splash = createSplashWindow();
  const error = createErrorWindow();
  const main = createMainWindow();

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
      main.loadURL(URL);
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
      main.webContents.insertCSS(insertCSS);
      main.show();
    }
  });
};

const setApplicationMenu = () => {
  const template = [
    ...(isMac
      ? [
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
        ]
      : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'togglefullscreen' },
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
      ],
    },
    {
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
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

app.setName('Comm');
setApplicationMenu();
app.whenReady().then(() => {
  show();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      show();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});
