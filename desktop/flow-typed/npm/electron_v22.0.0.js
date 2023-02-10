// @flow
// flow-typed signature: f8bfa3876f1890f644b65b1ebd801ed8
// flow-typed version: <<STUB>>/electron_v22.0.0/flow_v0.182.0

declare module 'electron' {
  declare export var app: App;
  declare type App = {
    quit(): void,
    whenReady(): Promise<void>,
    hide(): void,
    show(): void,
    setName: (name: string) => void,
    getVersion: () => string,
    dock: Dock,
    isPackaged: boolean,
    name: string,
    on: <T: $Keys<AppEvents>>(
      event: T,
      listener: $ElementType<AppEvents, T>,
    ) => void,
    removeListener: <T: $Keys<AppEvents>>(
      event: T,
      listener: $ElementType<AppEvents, T>,
    ) => void,
  };
  declare type AppEvents = {
    'window-all-closed': () => void,
    'activate': (event: Event, hasVisibleWindows: boolean) => void,
  };

  declare export class BrowserWindow {
    constructor(options?: {
      +width?: number,
      +height?: number,
      +x?: number,
      +y?: number,
      +useContentSize?: boolean,
      +center?: boolean,
      +minWidth?: number,
      +minHeight?: number,
      +maxWidth?: number,
      +maxHeight?: number,
      +resizable?: boolean,
      +movable?: boolean,
      +minimizable?: boolean,
      +maximizable?: boolean,
      +closable?: boolean,
      +focusable?: boolean,
      +alwaysOnTop?: boolean,
      +fullscreen?: boolean,
      +fullscreenable?: boolean,
      +simpleFullscreen?: boolean,
      +skipTaskbar?: boolean,
      +kiosk?: boolean,
      +title?: string,
      +icon?: string,
      +show?: boolean,
      +paintWhenInitiallyHidden?: boolean,
      +frame?: boolean,
      +parent?: BrowserWindow,
      +modal?: boolean,
      +acceptFirstMouse?: boolean,
      +disableAutoHideCursor?: boolean,
      +autoHideMenuBar?: boolean,
      +enableLargerThanScreen?: boolean,
      +backgroundColor?: string,
      +hasShadow?: boolean,
      +opacity?: number,
      +darkTheme?: boolean,
      +transparent?: boolean,
      +type?: string,
      +visualEffectState?: 'followWindow' | 'active' | 'inactive',
      +titleBarStyle?:
        | 'default'
        | 'hidden'
        | 'hiddenInset'
        | 'customButtonsOnHover',
      +trafficLightPosition?: { +x: number, +y: number },
      +roundedCorners?: boolean,
      +fullscreenWindowTitle?: boolean,
      +thickFrame?: boolean,
      +vibrancy?:
        | 'appearance-based'
        | 'light'
        | 'dark'
        | 'titlebar'
        | 'selection'
        | 'menu'
        | 'popover'
        | 'sidebar'
        | 'medium-light'
        | 'ultra-dark'
        | 'header'
        | 'sheet'
        | 'window'
        | 'hud'
        | 'fullscreen-ui'
        | 'tooltip'
        | 'content'
        | 'under-window'
        | 'under-page',
      +zoomToPageWidth?: boolean,
      +tabbingIdentifier?: string,
      +webPreferences?: {
        +preload?: string,
      },
      +titleBarOverlay?:
        | { +color?: string, +symbolColor?: string, +height?: number }
        | boolean,
    }): void;
    destroy(): void;
    close(): void;
    show(): void;
    hide(): void;
    maximize(): void;
    unmaximize(): void;
    isMaximized(): boolean;
    minimize(): void;
    loadURL(
      url: string,
      options?: {
        +userAgent?: string,
        +extraHeaders?: string,
        +baseURLForDataURL?: string,
      },
    ): Promise<void>;
    loadFile(
      filePath: string,
      options?: {
        +query?: { [string]: string },
        +search?: string,
        +hash?: string,
      },
    ): Promise<void>;
    reload(): void;
    setMenu(menu: Menu | null): void;
    isDestroyed(): boolean;
    static getAllWindows(): $ReadOnlyArray<BrowserWindow>;
    webContents: WebContents;

    on<T: $Keys<BrowserWindowEvents>>(
      event: T,
      listener: $ElementType<BrowserWindowEvents, T>,
    ): void;
    removeListener<T: $Keys<BrowserWindowEvents>>(
      event: T,
      listener: $ElementType<BrowserWindowEvents, T>,
    ): void;
  }

  declare type BrowserWindowEvents = {
    close: (event: Event) => void,
    closed: () => void,
  };

  declare export type Event = {
    preventDefault: () => void,
  };

  declare export var contextBridge: ContextBridge;
  declare type ContextBridge = {
    exposeInMainWorld(apiKey: string, api: mixed): void,
  };

  declare export var autoUpdater: AutoUpdater;
  declare class AutoUpdater {
    setFeedURL(options: {
      +url: string,
      +headers?: { +[string]: string },
      +serverType?: 'json' | 'default',
    }): void;
    getFeedURL(): string;
    checkForUpdates(): void;
    quitAndInstall(): void;

    on<T: $Keys<AutoUpdaterEvents>>(
      event: T,
      listener: $ElementType<AutoUpdaterEvents, T>,
    ): void;
    removeListener<T: $Keys<AutoUpdaterEvents>>(
      event: T,
      listener: $ElementType<AutoUpdaterEvents, T>,
    ): void;
  }

  declare type AutoUpdaterEvents = {
    'checking-for-update': () => void,
    'update-available': () => void,
    'update-not-available': () => void,
    'update-downloaded': (
      event: Event,
      releaseNotes?: string,
      releaseName: string,
      releaseDate?: Date,
      updateURL?: string,
    ) => void,
  };

  declare class Dock {
    setBadge(text: string): void;
    getBadge(): string;
    hide(): void;
    show(): Promise<void>;
  }

  declare export var ipcMain: IpcMain;
  declare type IpcMain = {
    on(
      channel: string,
      listener: (event: IpcMainEvent, ...args: $ReadOnlyArray<any>) => void,
    ): void,
    removeListener(
      channel: string,
      listener: (...args: $ReadOnlyArray<any>) => void,
    ): void,
  };
  declare export type IpcMainEvent = {
    +processId: number,
    +frameId: number,
    returnValue: mixed,
    +sender: WebContents,
    +reply: (channel: string, ...args: $ReadOnlyArray<any>) => void,
  };

  declare export var ipcRenderer: IpcRenderer;
  declare type IpcRenderer = {
    on(
      channel: string,
      listener: (event: IpcRendererEvent, ...args: $ReadOnlyArray<any>) => void,
    ): void,
    removeListener(
      channel: string,
      listener: (...args: $ReadOnlyArray<any>) => void,
    ): void,
    send(channel: string, ...args: $ReadOnlyArray<mixed>): void,
    sendSync(channel: string, ...args: $ReadOnlyArray<mixed>): any,
  };

  declare export type MenuItemConstructorOptions = {
    label?: string,
    submenu?: $ReadOnlyArray<MenuItemConstructorOptions>,
    type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio',
    role?:
      | 'undo'
      | 'redo'
      | 'cut'
      | 'copy'
      | 'paste'
      | 'pasteAndMatchStyle'
      | 'delete'
      | 'selectAll'
      | 'reload'
      | 'forceReload'
      | 'toggleDevTools'
      | 'resetZoom'
      | 'zoomIn'
      | 'zoomOut'
      | 'toggleSpellChecker'
      | 'togglefullscreen'
      | 'window'
      | 'minimize'
      | 'close'
      | 'help'
      | 'about'
      | 'services'
      | 'hide'
      | 'hideOthers'
      | 'unhide'
      | 'quit'
      | 'showSubstitutions'
      | 'toggleSmartQuotes'
      | 'toggleSmartDashes'
      | 'toggleTextReplacement'
      | 'startSpeaking'
      | 'stopSpeaking'
      | 'zoom'
      | 'front'
      | 'appMenu'
      | 'fileMenu'
      | 'editMenu'
      | 'viewMenu'
      | 'shareMenu'
      | 'recentDocuments'
      | 'toggleTabBar'
      | 'selectNextTab'
      | 'selectPreviousTab'
      | 'mergeAllWindows'
      | 'clearRecentDocuments'
      | 'moveTabToNewWindow'
      | 'windowMenu',
  };
  declare export class Menu {
    constructor(): void;
    static setApplicationMenu(menu: Menu | null): void;
    static buildFromTemplate(
      template: $ReadOnlyArray<MenuItemConstructorOptions>,
    ): Menu;
  }

  declare export var shell: Shell;
  declare type Shell = {
    openExternal(
      url: string,
      options?: { +activate?: boolean, +workingDirectory?: string },
    ): Promise<void>,
  };

  declare export var systemPreferences: SystemPreferences;
  declare type SystemPreferences = {
    getUserDefault<Type: $Keys<UserDefaultTypes>>(
      key: string,
      type: Type,
    ): $ElementType<UserDefaultTypes, Type>,
  };
  declare export type UserDefaultTypes = {
    string: string,
    boolean: boolean,
    integer: number,
    float: number,
    double: number,
    url: string,
    array: Array<mixed>,
    dictionary: { [string]: mixed },
  };

  declare class WebContents {
    loadURL(
      url: string,
      options?: {
        +userAgent?: string,
        +extraHeaders?: string,
        +baseURLForDataURL?: string,
      },
    ): Promise<void>;
    loadFile(
      filePath: string,
      options?: {
        +query?: { [string]: string },
        +search?: string,
        +hash?: string,
      },
    ): Promise<void>;
    canGoBack(): boolean;
    canGoForward(): boolean;
    clearHistory(): void;
    insertCSS(css: string, options?: { +cssOrigin?: string }): Promise<string>;
    setWindowOpenHandler(
      handler: (details: {
        +url: string,
        +frameName: string,
        +features: string,
        +disposition:
          | 'default'
          | 'foreground-tab'
          | 'background-tab'
          | 'new-window'
          | 'save-to-disk'
          | 'other',
      }) =>
        | { +action: 'deny' }
        | { +action: 'allow', +outlivesOpener?: boolean },
    ): void;
    send(channel: string, ...args: $ReadOnlyArray<mixed>): void;

    on<T: $Keys<WebContentsEvents>>(
      event: T,
      listener: $ElementType<WebContentsEvents, T>,
    ): void;
  }
  declare type WebContentsEvents = {
    'did-finish-load': () => void,
    'did-fail-load': (
      event: Event,
      errorCode: number,
      errorDescription: string,
      validatedURL: string,
      isMainFrame: boolean,
      frameProcessId: number,
      frameRoutingId: number,
    ) => void,
    'did-navigate-in-page': (
      event: Event,
      url: string,
      isMainFrame: boolean,
      frameProcessId: number,
      frameRoutingId: number,
    ) => void,
  };
  declare export type IpcRendererEvent = {
    sender: IpcRenderer,
    senderId: number,
    ports: $ReadOnlyArray<MessagePort>,
  };

  declare export var dialog: Dialog;
  declare class Dialog {
    showErrorBox(title: string, content: string): void;
  }
}

declare module 'electron/main' {
  declare export {
    app,
    BrowserWindow,
    shell,
    Menu,
    ipcMain,
    systemPreferences,
    autoUpdater,
    dialog,
  } from 'electron';
}

declare module 'electron/renderer' {
  declare export {
    IpcRendererEvent,
    contextBridge,
    ipcRenderer,
  } from 'electron';
}
