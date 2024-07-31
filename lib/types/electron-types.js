// @flow

import type { SenderDeviceDescriptor } from './notif-types';

type OnNavigateListener = ({
  +canGoBack: boolean,
  +canGoForward: boolean,
}) => void;

type OnNewVersionAvailableListener = (version: string) => void;

type OnDeviceTokenRegisteredListener = (token: ?string) => void;

type OnNotificationClickedListener = (data: { threadID: string }) => void;

type OnEncryptedNotificationListener = (data: {
  encryptedPayload: string,
  type: string,
  senderDeviceDescriptor: SenderDeviceDescriptor,
}) => mixed;

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
  +fetchDeviceToken: () => void,
  +onEncryptedNotification?: OnEncryptedNotificationListener => () => void,
  +showDecryptedNotification: (decryptedPayload: { +[string]: mixed }) => void,
};
