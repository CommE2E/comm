// @flow

import type { ServerCalls } from './action-utils';
import type { AppState } from '../types/redux-types';
import {
  type ConnectionStatus,
  connectionStatusPropType,
} from '../types/socket-types';
import { type CurrentUserInfo, currentUserPropType } from '../types/user-types';

import { connect as reactReduxConnect } from 'react-redux';
import invariant from 'invariant';
import { createSelector } from 'reselect';
import PropTypes from 'prop-types';

import {
  includeDispatchActionProps,
  bindServerCalls,
} from './action-utils';

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

function connect<S: AppState, OP: Object, SP: Object>(
  inputMapStateToProps: ?((state: S, ownProps: OP) => SP),
  serverCalls?: ?ServerCalls,
  includeDispatch?: bool,
): * {
  const mapStateToProps = inputMapStateToProps;
  const serverCallExists = serverCalls && Object.keys(serverCalls).length > 0;
  let mapState = null;
  if (serverCallExists && mapStateToProps && mapStateToProps.length > 1) {
    mapState = (state: S, ownProps: OP): {
      ...SP,
      cookie: ?string,
      urlPrefix: string,
      sessionID: ?string,
      currentUserInfo: ?CurrentUserInfo,
      connectionStatus: ConnectionStatus,
    } => ({
      ...mapStateToProps(state, ownProps),
      ...serverCallStateSelector(state),
    });
  } else if (serverCallExists && mapStateToProps) {
    mapState = (state: S): {
      ...SP,
      cookie: ?string,
      urlPrefix: string,
      sessionID: ?string,
      currentUserInfo: ?CurrentUserInfo,
      connectionStatus: ConnectionStatus,
    } => ({
      // $FlowFixMe
      ...mapStateToProps(state),
      ...serverCallStateSelector(state),
    });
  } else if (mapStateToProps) {
    mapState = mapStateToProps;
  } else if (serverCallExists) {
    mapState = serverCallStateSelector;
  }
  const dispatchIncluded = includeDispatch === true
    || (includeDispatch === undefined && serverCallExists);
  if (dispatchIncluded && serverCallExists) {
    invariant(mapState && serverCalls, "should be set");
    return reactReduxConnect(
      mapState,
      includeDispatchActionProps,
      bindServerCalls(serverCalls),
    );
  } else if (dispatchIncluded) {
    return reactReduxConnect(
      mapState,
      includeDispatchActionProps,
    );
  } else if (serverCallExists) {
    invariant(mapState && serverCalls, "should be set");
    return reactReduxConnect(
      mapState,
      undefined,
      bindServerCalls(serverCalls),
    );
  } else {
    invariant(mapState, "should be set");
    return reactReduxConnect(mapState);
  }
}

export {
  serverCallStatePropType,
  serverCallStateSelector,
  connect,
};
