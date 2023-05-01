// @flow

type TBSharedConnectionInitializationMessage = {
  +type: 'sessionRequest',
  +deviceID: string,
  +accessToken: string,
  +deviceAppVersion?: string,
  +userID: string,
};

export type TBKeyserverConnectionInitializationMessage = {
  ...TBSharedConnectionInitializationMessage,
  +deviceType: 'keyserver',
};

export type TBClientConnectionInitializationMessage = {
  ...TBSharedConnectionInitializationMessage,
  +deviceType: 'web' | 'mobile',
};

export type TBNotifyClientConnectionInitializationMessage = {
  ...TBClientConnectionInitializationMessage,
  +notifyToken: string,
  +notifyPlatform: 'apns' | 'fcm' | 'web' | 'wns',
};

export type TBConnectionInitializationMessage =
  | TBKeyserverConnectionInitializationMessage
  | TBClientConnectionInitializationMessage
  | TBNotifyClientConnectionInitializationMessage;
