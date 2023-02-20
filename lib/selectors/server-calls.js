// @flow

import { createSelector } from 'reselect';

import type { AppState } from '../types/redux-types.js';
import { type ConnectionStatus } from '../types/socket-types.js';
import { type CurrentUserInfo } from '../types/user-types.js';

export type ServerCallState = {
  +cookie: ?string,
  +urlPrefix: string,
  +sessionID: ?string,
  +currentUserInfo: ?CurrentUserInfo,
  +connectionStatus: ConnectionStatus,
};

const serverCallStateSelector: (state: AppState) => ServerCallState =
  createSelector(
    (state: AppState) => state.cookie,
    (state: AppState) => state.urlPrefix,
    (state: AppState) => state.sessionID,
    (state: AppState) => state.currentUserInfo,
    (state: AppState) => state.connection.status,
    (
      cookie: ?string,
      urlPrefix: string,
      sessionID: ?string,
      currentUserInfo: ?CurrentUserInfo,
      connectionStatus: ConnectionStatus,
    ) => ({
      cookie,
      urlPrefix,
      sessionID,
      currentUserInfo,
      connectionStatus,
    }),
  );

export { serverCallStateSelector };
