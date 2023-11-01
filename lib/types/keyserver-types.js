// @flow

import t, { type TInterface } from 'tcomb';

import type { PlatformDetails } from './device-types.js';
import { connectionInfoValidator } from './socket-types.js';
import type { ConnectionInfo } from './socket-types.js';
import { tShape, tPlatformDetails } from '../utils/validation-utils.js';

export type KeyserverInfo = {
  +cookie: ?string,
  +sessionID?: ?string,
  +updatesCurrentAsOf: number, // millisecond timestamp
  +urlPrefix: string,
  +connection: ConnectionInfo,
  +lastCommunicatedPlatformDetails: ?PlatformDetails,
};

export type KeyserverInfos = { +[key: string]: KeyserverInfo };

export type KeyserverStore = {
  +keyserverInfos: KeyserverInfos,
};

export type SelectedKeyserverInfo = {
  +keyserverAdminUsername: string,
  +keyserverInfo: KeyserverInfo,
};

export const keyserverInfoValidator: TInterface<KeyserverInfo> =
  tShape<KeyserverInfo>({
    cookie: t.maybe(t.String),
    sessionID: t.maybe(t.String),
    updatesCurrentAsOf: t.Number,
    urlPrefix: t.String,
    connection: connectionInfoValidator,
    lastCommunicatedPlatformDetails: t.maybe(tPlatformDetails),
  });

export const keyserverStoreValidator: TInterface<KeyserverStore> =
  tShape<KeyserverStore>({
    keyserverInfos: t.dict(t.String, keyserverInfoValidator),
  });
