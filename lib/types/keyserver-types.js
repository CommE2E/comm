// @flow

import t, { type TInterface } from 'tcomb';

import type { PlatformDetails } from './device-types.js';
import { connectionInfoValidator } from './socket-types.js';
import type { ConnectionInfo } from './socket-types.js';
import { tShape, tPlatformDetails } from '../utils/validation-utils.js';

// Once we start using the cookie field on web,
// the cookie field should be mandatory, of type ?string.
// See https://linear.app/comm/issue/ENG-4347/stop-using-browser-cookies
export type KeyserverInfo = {
  +cookie?: ?string,
  +sessionID?: ?string,
  +updatesCurrentAsOf: number, // millisecond timestamp
  +urlPrefix: string,
  +connection: ConnectionInfo,
  +lastCommunicatedPlatformDetails: ?PlatformDetails,
};

export type KeyserverStore = {
  +keyserverInfos: { +[key: string]: KeyserverInfo },
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
