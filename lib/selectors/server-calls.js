// @flow

import PropTypes from 'prop-types';
import { createSelector } from 'reselect';

import type { AppState } from '../types/redux-types';
import {
  type ConnectionStatus,
  connectionStatusPropType,
} from '../types/socket-types';
import { type CurrentUserInfo, currentUserPropType } from '../types/user-types';

export type ServerCallState = {|
  cookie: ?string,
  urlPrefix: string,
  sessionID: ?string,
  currentUserInfo: ?CurrentUserInfo,
  connectionStatus: ConnectionStatus,
|};

const serverCallStatePropType = PropTypes.shape({
  cookie: PropTypes.string,
  urlPrefix: PropTypes.string.isRequired,
  sessionID: PropTypes.string,
  currentUserInfo: currentUserPropType,
  connectionStatus: connectionStatusPropType.isRequired,
});

const serverCallStateSelector: (
  state: AppState,
) => ServerCallState = createSelector(
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

export { serverCallStatePropType, serverCallStateSelector };
