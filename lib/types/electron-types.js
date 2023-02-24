// @flow

type OnNavigateListener = ({
  +canGoBack: boolean,
  +canGoForward: boolean,
}) => void;

type OnNewVersionAvailableListener = (version: string) => void;

type OnDeviceTokenRegisteredListener = (token: ?string) => void;

type OnNotificationClickedListener = (data: { threadID: string }) => void;

export type ElectronBridge = {
  // Returns a callback that you can call to remove the listener
  +onNavigate: OnNavigateListener => () => void,
  +clearHistory: () => void,
  +doubleClickTopBar: () => void,
  +setBadge: (number | string | null) => void,
  +version?: string,
  // Returns a callback that you can call to remove the listener
  +onNewVersionAvailable?: OnNewVersionAvailableListener => () => void,
  +updateToNewVersion?: () => void,
  +platform?: 'windows' | 'macos',
  +onDeviceTokenRegistered?: OnDeviceTokenRegisteredListener => () => void,
  +onNotificationClicked?: OnNotificationClickedListener => () => void,
};
