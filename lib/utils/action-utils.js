// @flow

import type { Dispatch, BaseAppState, BaseAction } from '../types/redux-types';
import type { LoadingOptions, LoadingInfo } from '../types/loading-types';
import type { FetchJSON } from './fetch-json';

import invariant from 'invariant';
import _mapValues from 'lodash/fp/mapValues';

import fetchJSON from './fetch-json';

let nextPromiseIndex = 0;

function wrapActionPromise<T: BaseAppState, A>(
  actionType: string,
  promise: Promise<*>,
  loadingOptions?: ?LoadingOptions,
  startingPayload?: any,
): (dispatch: Dispatch<T, A>) => Promise<void> {
  const loadingInfo = {
    fetchIndex: nextPromiseIndex++,
    trackMultipleRequests:
      !!(loadingOptions && loadingOptions.trackMultipleRequests),
    customKeyName: loadingOptions && loadingOptions.customKeyName
      ? loadingOptions.customKeyName
      : null,
  };
  return (async (dispatch: Dispatch<T, A>): Promise<void> => {
    const startAction: {
      type: string,
      loadingInfo: LoadingInfo,
      payload?: any,
    } = {
      type: actionType + "_STARTED",
      loadingInfo,
    };
    if (startingPayload) {
      startAction.payload = startingPayload;
    }
    dispatch(startAction);
    try {
      const result = await promise;
      dispatch({
        type: actionType + "_SUCCESS",
        payload: result,
        loadingInfo,
      });
    } catch (e) {
      console.log(e);
      dispatch({
        type: actionType + "_FAILED",
        error: true,
        payload: e,
        loadingInfo,
      });
    }
  });
}

export type DispatchActionPayload = (actionType: string, payload: *) => void;
export type DispatchActionPromise = (
  actionType: string,
  promise: Promise<*>,
  loadingOptions?: LoadingOptions,
  startingPayload?: any,
) => Promise<void>;

type DispatchActionHelperProps = {
  dispatchActionPayload?: bool,
  dispatchActionPromise?: bool,
};
type BoundActions<T: BaseAppState, A> = {
  dispatch: Dispatch<T, A>,
  dispatchActionPayload?: DispatchActionPayload,
  dispatchActionPromise?: DispatchActionPromise,
};
function includeDispatchActionProps<T: BaseAppState, A, P>(
  whichOnes: DispatchActionHelperProps,
): ((dispatch: Dispatch<T, A>) => BoundActions<T, A>) {
  return (dispatch: Dispatch<T, A>) => {
    const boundActions: BoundActions<T, A> = { dispatch };
    if (whichOnes.dispatchActionPromise) {
      boundActions.dispatchActionPromise =
        (
          actionType: string,
          promise: Promise<P>,
          loadingOptions?: LoadingOptions,
          startingPayload?: any,
        // Flow can't handle how Redux middleware like redux-thunk
        // can change dispatch's return type $FlowFixMe 
        ) => dispatch(wrapActionPromise(
          actionType,
          promise,
          loadingOptions,
          startingPayload,
        ));
    }
    if (whichOnes.dispatchActionPayload) {
      boundActions.dispatchActionPayload =
        (actionType: string, payload: P) =>
          dispatch({ type: actionType, payload });
    }
    return boundActions;
  };
}

// All server calls needs to include some information from the Redux state
// (namely, the cookie). This information is used deep in the server call,
// at the point where fetchJSON is called. We don't want to bother propagating
// the cookie (and any future config info that fetchJSON needs) through to the
// server calls so they can pass it to fetchJSON. Instead, we "curry" the cookie
// onto fetchJSON within react-redux's connect's mapStateToProps function, and
// then pass that "bound" fetchJSON that no longer needs the cookie as a
// parameter on to the server call.
function bindCookieAndUtilsIntoServerCall<B>(
  actionFunc: (fetchJSON: FetchJSON, ...rest: any) => Promise<B>,
  dispatch: (action: BaseAction) => void,
  cookie: ?string,
) {
  const setCookie = (newCookie: ?string) => {
    if (newCookie !== cookie) {
      dispatch({ type: "SET_COOKIE", payload: newCookie });
    }
  };
  const boundFetchJSON = (async (url: string, data: Object) => {
    return await fetchJSON(cookie, setCookie, url, data);
  });
  return (async (...rest: any) => {
    return await actionFunc(boundFetchJSON, ...rest);
  });
}

function bindServerCalls(
  serverCalls:
    {[name: string]: (fetchJSON: FetchJSON, ...rest: any) => Promise<any>},
) {
  // Flow can't handle when I type dispatchProps correctly. I think it's because
  // our dispatch is incompatible with the flow-typed one, since the flow-typed
  // one doesn't consider redux-thunk. It seems that Flow can't handle how Redux
  // middleware like redux-thunk can change dispatch's return type.
  return (
    stateProps: { cookie: ?string },
    dispatchProps: Object,
    ownProps: {[propName: string]: mixed},
  ) => {
    const dispatch = dispatchProps.dispatch;
    invariant(dispatch, "should be defined");
    const { cookie, ...restStateProps } = stateProps;
    const boundServerCalls = _mapValues(
      (serverCall: (fetchJSON: FetchJSON, ...rest: any) => Promise<any>) =>
        bindCookieAndUtilsIntoServerCall(serverCall, dispatch, cookie),
    )(serverCalls);
    return {
      ...ownProps,
      ...restStateProps,
      ...dispatchProps,
      ...boundServerCalls,
    };
  };
}

export {
  includeDispatchActionProps,
  bindServerCalls,
};
