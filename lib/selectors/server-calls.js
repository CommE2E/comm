// @flow

import _memoize from 'lodash/memoize.js';
import { createSelector } from 'reselect';

import {
  cookieSelector,
  sessionIDSelector,
  urlPrefixSelector,
  connectionSelector,
  lastCommunicatedPlatformDetailsSelector,
} from './keyserver-selectors.js';
import type { RecoveryFromReduxActionSource } from '../types/account-types.js';
import type { PlatformDetails } from '../types/device-types.js';
import type { AppState } from '../types/redux-types.js';
import type { ConnectionInfo } from '../types/socket-types.js';
import { type CurrentUserInfo } from '../types/user-types.js';

export type ServerCallState = {
  +cookie: ?string,
  +urlPrefix: ?string,
  +sessionID: ?string,
  +currentUserInfo: ?CurrentUserInfo,
  +isSocketConnected: ?boolean,
  +activeSessionRecovery: ?RecoveryFromReduxActionSource,
  +lastCommunicatedPlatformDetails: ?PlatformDetails,
};

const baseServerCallStateSelector: (
  keyserverID: string,
) => (state: AppState) => ServerCallState = keyserverID =>
  createSelector(
    cookieSelector(keyserverID),
    urlPrefixSelector(keyserverID),
    sessionIDSelector(keyserverID),
    (state: AppState) => state.currentUserInfo,
    connectionSelector(keyserverID),
    lastCommunicatedPlatformDetailsSelector(keyserverID),
    (
      cookie: ?string,
      urlPrefix: ?string,
      sessionID: ?string,
      currentUserInfo: ?CurrentUserInfo,
      connectionInfo: ?ConnectionInfo,
      lastCommunicatedPlatformDetails: ?PlatformDetails,
    ) => ({
      cookie,
      urlPrefix,
      sessionID,
      currentUserInfo,
      isSocketConnected:
        connectionInfo?.status !== undefined
          ? connectionInfo?.status === 'connected'
          : undefined,
      activeSessionRecovery: connectionInfo?.activeSessionRecovery,
      lastCommunicatedPlatformDetails,
    }),
  );

const serverCallStateSelector: (
  keyserverID: string,
) => (state: AppState) => ServerCallState = _memoize(
  baseServerCallStateSelector,
);

export { serverCallStateSelector };
