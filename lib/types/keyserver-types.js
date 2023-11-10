// @flow

import t, { type TInterface } from 'tcomb';

import type { PlatformDetails } from './device-types.js';
import { connectionInfoValidator } from './socket-types.js';
import type { ConnectionInfo } from './socket-types.js';
import type { GlobalAccountUserInfo } from './user-types.js';
import { tShape, tPlatformDetails } from '../utils/validation-utils.js';

export type KeyserverInfo = {
  +cookie: ?string,
  +sessionID?: ?string,
  +updatesCurrentAsOf: number, // millisecond timestamp
  +urlPrefix: string,
  +connection: ConnectionInfo,
  +lastCommunicatedPlatformDetails: ?PlatformDetails,
  +deviceToken: ?string,
};

export type KeyserverInfos = { +[key: string]: KeyserverInfo };

export type KeyserverStore = {
  +keyserverInfos: KeyserverInfos,
};

export type SelectedKeyserverInfo = {
  +keyserverAdminUserInfo: GlobalAccountUserInfo,
  +keyserverInfo: KeyserverInfo,
};

export type AddKeyserverPayload = {
  +keyserverAdminUserID: string,
  +newKeyserverInfo: KeyserverInfo,
};

export type RemoveKeyserverPayload = {
  +keyserverAdminUserID: string,
};

export const keyserverInfoValidator: TInterface<KeyserverInfo> =
  tShape<KeyserverInfo>({
    cookie: t.maybe(t.String),
    sessionID: t.maybe(t.String),
    updatesCurrentAsOf: t.Number,
    urlPrefix: t.String,
    connection: connectionInfoValidator,
    lastCommunicatedPlatformDetails: t.maybe(tPlatformDetails),
    deviceToken: t.maybe(t.String),
  });

export const keyserverStoreValidator: TInterface<KeyserverStore> =
  tShape<KeyserverStore>({
    keyserverInfos: t.dict(t.String, keyserverInfoValidator),
  });
