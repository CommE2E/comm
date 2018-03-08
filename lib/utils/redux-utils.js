// @flow

import type { ServerCalls } from './action-utils';
import type { BaseAppState } from '../types/redux-types';

import { connect as reactReduxConnect } from 'react-redux';
import invariant from 'invariant';

import {
  includeDispatchActionProps,
  bindServerCalls,
} from './action-utils';

function connect<S: BaseAppState, OP: Object, SP: Object>(
  inputMapStateToProps: ?((state: S, ownProps: OP) => SP),
  serverCalls?: ?ServerCalls,
  includeDispatch?: bool,
): * {
  const mapStateToProps = inputMapStateToProps;
  const serverCallExists = serverCalls && Object.keys(serverCalls).length > 0;
  let mapState;
  if (serverCallExists && mapStateToProps && mapStateToProps.length > 1) {
    mapState = (objectState: Object, ownProps: OP): {
      ...SP,
      cookie: ?string,
      urlPrefix: string,
    } => {
      const state: S = (objectState: any);
      return {
        ...mapStateToProps(state, ownProps),
        cookie: state.cookie,
        urlPrefix: state.urlPrefix,
      };
    };
  } else if (serverCallExists && mapStateToProps) {
    mapState = (objectState: Object): {
      ...SP,
      cookie: ?string,
      urlPrefix: string,
    } => {
      const state: S = (objectState: any);
      return {
        // $FlowFixMe
        ...mapStateToProps(state),
        cookie: state.cookie,
        urlPrefix: state.urlPrefix,
      };
    };
  } else if (mapStateToProps && mapStateToProps.length > 1) {
    mapState = (objectState: Object, ownProps: OP): SP => {
      const state: S = (objectState: any);
      return mapStateToProps(state, ownProps);
    };
  } else if (mapStateToProps) {
    mapState = (objectState: Object): SP => {
      const state: S = (objectState: any);
      // $FlowFixMe
      return mapStateToProps(state);
    };
  } else if (serverCallExists) {
    mapState = (objectState: Object): {
      cookie: ?string,
      urlPrefix: string,
    } => {
      const state: S = (objectState: any);
      return {
        cookie: state.cookie,
        urlPrefix: state.urlPrefix,
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
