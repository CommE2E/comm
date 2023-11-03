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
import type { PlatformDetails } from '../types/device-types.js';
import type { AppState } from '../types/redux-types.js';
import type {
  ConnectionInfo,
  ConnectionStatus,
} from '../types/socket-types.js';
import { type CurrentUserInfo } from '../types/user-types.js';

export type ServerCallState = {
  +cookie: ?string,
  +urlPrefix: ?string,
  +sessionID: ?string,
  +currentUserInfo: ?CurrentUserInfo,
  +connectionStatus: ?ConnectionStatus,
  +lastCommunicatedPlatformDetails: ?PlatformDetails,
};

const baseServerCallStateSelector: (
  id: string,
) => (state: AppState) => ServerCallState = (id: string) =>
  createSelector(
    cookieSelector,
    urlPrefixSelector,
    sessionIDSelector,
    (state: AppState) => state.currentUserInfo,
    connectionSelector(id),
    lastCommunicatedPlatformDetailsSelector(id),
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
      connectionStatus: connectionInfo?.status,
      lastCommunicatedPlatformDetails,
    }),
  );

const serverCallStateSelector: (
  id: string,
) => (state: AppState) => ServerCallState = _memoize(
  baseServerCallStateSelector,
);

export { serverCallStateSelector };
