// @flow

import t, { type TInterface } from 'tcomb';

import {
  type IdentityKeysBlob,
  identityKeysBlobValidator,
} from './crypto-types.js';
import type { Platform, PlatformDetails } from './device-types.js';
import {
  calendarQueryValidator,
  type CalendarQuery,
  defaultCalendarQuery,
} from './entry-types.js';
import {
  type ConnectionInfo,
  connectionInfoValidator,
  defaultConnectionInfo,
} from './socket-types.js';
import type { GlobalAccountUserInfo } from './user-types.js';
import { getConfig } from '../utils/config.js';
import { tShape, tPlatformDetails } from '../utils/validation-utils.js';

export type KeyserverInfo = {
  +cookie: ?string,
  +sessionID?: ?string,
  +updatesCurrentAsOf: number, // millisecond timestamp
  +urlPrefix: string,
  +connection: ConnectionInfo,
  +lastCommunicatedPlatformDetails: ?PlatformDetails,
  +deviceToken: ?string,
  +actualizedCalendarQuery: CalendarQuery,
};

const defaultKeyserverInfo: (
  urlPrefix: string,
  platform?: Platform,
) => KeyserverInfo = (urlPrefix, platform) => {
  let currentPlatform = platform;
  if (!currentPlatform) {
    currentPlatform = getConfig().platformDetails.platform;
  }
  return {
    cookie: null,
    updatesCurrentAsOf: 0,
    urlPrefix,
    connection: defaultConnectionInfo,
    lastCommunicatedPlatformDetails: null,
    deviceToken: null,
    actualizedCalendarQuery: defaultCalendarQuery(currentPlatform),
  };
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
    actualizedCalendarQuery: calendarQueryValidator,
  });

export const keyserverStoreValidator: TInterface<KeyserverStore> =
  tShape<KeyserverStore>({
    keyserverInfos: t.dict(t.String, keyserverInfoValidator),
  });

export type RecreateNotifsOlmSessionRequest = {
  +initialEncryptedMessage: string,
  +identityKeysBlob: IdentityKeysBlob,
};

export const recreateNotifsOlmSessionRequestValidator: TInterface<RecreateNotifsOlmSessionRequest> =
  tShape<RecreateNotifsOlmSessionRequest>({
    initialEncryptedMessage: t.String,
    identityKeysBlob: identityKeysBlobValidator,
  });

export { defaultKeyserverInfo };
