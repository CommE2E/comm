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

export type MessageToTunnelbroker =
  | TBKeyserverConnectionInitializationMessage
  | TBClientConnectionInitializationMessage
  | TBNotifyClientConnectionInitializationMessage;

export const tunnelbrokerMessageTypes = Object.freeze({
  REFRESH_KEYS_REQUEST: 'RefreshKeyRequest',
});

export type TBRefreshKeysRequest = {
  +type: 'RefreshKeyRequest',
  +deviceId: string,
  +numberOfKeys: number,
};

export const refreshKeysTBMessageValidator: TInterface<TBRefreshKeysRequest> =
  tShape<TBRefreshKeysRequest>({
    type: tString('RefreshKeyRequest'),
    deviceId: t.String,
    numberOfKeys: t.Number,
  });

// Disjoint enumeration of all messages received from Tunnelbroker
// Currently, only a single message
export type MessageFromTunnelbroker = TBRefreshKeysRequest;
