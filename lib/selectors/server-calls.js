// @flow

import { createSelector } from 'reselect';

import type { LastCommunicatedPlatformDetails } from '../types/device-types.js';
import type { AppState } from '../types/redux-types.js';
import { type ConnectionStatus } from '../types/socket-types.js';
import { type CurrentUserInfo } from '../types/user-types.js';

export type ServerCallState = {
  +cookie: ?string,
  +urlPrefix: string,
  +sessionID: ?string,
  +currentUserInfo: ?CurrentUserInfo,
  +connectionStatus: ConnectionStatus,
  +lastCommunicatedPlatformDetails: LastCommunicatedPlatformDetails,
};

const serverCallStateSelector: (state: AppState) => ServerCallState =
  createSelector(
    (state: AppState) => state.cookie,
    (state: AppState) => state.urlPrefix,
    (state: AppState) => state.sessionID,
    (state: AppState) => state.currentUserInfo,
    (state: AppState) => state.connection.status,
    (state: AppState) => state.lastCommunicatedPlatformDetails,
    (
      cookie: ?string,
      urlPrefix: string,
      sessionID: ?string,
      currentUserInfo: ?CurrentUserInfo,
      connectionStatus: ConnectionStatus,
      lastCommunicatedPlatformDetails: LastCommunicatedPlatformDetails,
    ) => ({
      cookie,
      urlPrefix,
      sessionID,
      currentUserInfo,
      connectionStatus,
      lastCommunicatedPlatformDetails,
    }),
  );

export { serverCallStateSelector };
