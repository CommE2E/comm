// @flow

import type { ServerCalls } from './action-utils';
import type { BaseAppState } from '../types/redux-types';

import { connect as reactReduxConnect } from 'react-redux';
import invariant from 'invariant';

import {
  includeDispatchActionProps,
  bindServerCalls,
} from './action-utils';

function connect<S: BaseAppState<*>, OP: Object, SP: Object>(
  inputMapStateToProps: ?((state: S, ownProps: OP) => SP),
  serverCalls?: ?ServerCalls,
  includeDispatch?: bool,
): * {
  const mapStateToProps = inputMapStateToProps;
  const serverCallExists = serverCalls && Object.keys(serverCalls).length > 0;
  let mapState;
  if (serverCallExists && mapStateToProps && mapStateToProps.length > 1) {
    mapState = (state: S, ownProps: OP): {
      ...SP,
      cookie: ?string,
      urlPrefix: string,
      deviceToken: ?string,
    } => {
      return {
        ...mapStateToProps(state, ownProps),
        cookie: state.cookie,
        urlPrefix: state.urlPrefix,
        deviceToken: state.deviceToken,
      };
    };
  } else if (serverCallExists && mapStateToProps) {
    mapState = (state: S): {
      ...SP,
      cookie: ?string,
      urlPrefix: string,
      deviceToken: ?string,
    } => {
      return {
        // $FlowFixMe
        ...mapStateToProps(state),
        cookie: state.cookie,
        urlPrefix: state.urlPrefix,
        deviceToken: state.deviceToken,
      };
    };
  } else if (mapStateToProps && mapStateToProps.length > 1) {
    mapState = (state: S, ownProps: OP): SP => {
      return mapStateToProps(state, ownProps);
    };
  } else if (mapStateToProps) {
    mapState = (objectState: Object): SP => {
      const state: S = (objectState: any);
      // $FlowFixMe
      return mapStateToProps(state);
    };
  } else if (serverCallExists) {
    mapState = (state: S): {
      cookie: ?string,
      urlPrefix: string,
      deviceToken: ?string,
    } => {
      return {
        cookie: state.cookie,
        urlPrefix: state.urlPrefix,
        deviceToken: state.deviceToken,
      };
    };
  } else {
    invariant(false, "connect called but nothing to do!");
  }
  const dispatchIncluded = includeDispatch === true
    || (includeDispatch === undefined && serverCallExists);
  if (dispatchIncluded && serverCallExists) {
    invariant(serverCalls, "should be set");
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
    invariant(serverCalls, "should be set");
    return reactReduxConnect(
      mapState,
      undefined,
      bindServerCalls(serverCalls),
    );
  } else {
    return reactReduxConnect(mapState);
  }
}

export {
  connect,
};
