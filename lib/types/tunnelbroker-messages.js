// @flow

import t, { type TInterface } from 'tcomb';

import { tShape, tString } from '../utils/validation-utils.js';

type TBSharedConnectionInitializationMessage = {
  +type: 'sessionRequest',
  +deviceId: string,
  +accessToken: string,
  +deviceAppVersion?: string,
  +userId: string,
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

export type TBRefreshKeysRequest = {
  +type: 'refreshKeysRequest',
  +deviceID: string,
  +numberOfKeys: number,
};

export const TBRefreshKeysValidator: TInterface<TBRefreshKeysRequest> =
  tShape<TBRefreshKeysRequest>({
    type: tString('refreshKeysRequest'),
    deviceID: t.String,
    numberOfKeys: t.Number,
  });

// Disjoint enumeration of all messages
// Currently, only a single message
export type TBMessage = TBRefreshKeysRequest;
