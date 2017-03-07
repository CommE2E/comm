// @flow

import type { Dispatch, BaseAppState } from '../types/redux-types';
import type { LoadingOptions, LoadingInfo } from '../types/loading-types';
import type { FetchJSON } from './fetch-json';

import { createSelector } from 'reselect';

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
function includeDispatchActionProps<T: BaseAppState, A, P>(
  whichOnes: DispatchActionHelperProps,
) {
  return (dispatch: Dispatch<T, A>) => {
    if (whichOnes.dispatchActionPromise && whichOnes.dispatchActionPayload) {
      return {
        dispatchActionPayload: (actionType: string, payload: P) =>
          dispatch({ type: actionType, payload }),
        dispatchActionPromise: (
          actionType: string,
          promise: Promise<P>,
          loadingOptions?: LoadingOptions,
          startingPayload?: any,
        ) => dispatch(wrapActionPromise(
          actionType,
          promise,
          loadingOptions,
          startingPayload,
        )),
      };
    } else if (whichOnes.dispatchActionPayload) {
      return {
        dispatchActionPayload: (actionType: string, payload: P) =>
          dispatch({ type: actionType, payload }),
      };
    } else if (whichOnes.dispatchActionPromise) {
      return {
        dispatchActionPromise: (
          actionType: string,
          promise: Promise<P>,
          loadingOptions?: LoadingOptions,
          startingPayload?: any,
        ) => dispatch(wrapActionPromise(
          actionType,
          promise,
          loadingOptions,
          startingPayload,
        )),
      };
    } else {
      return {};
    }
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
function bindServerCall<B>(
  actionFunc: (fetchJSON: FetchJSON, ...rest: any) => Promise<B>,
  cookie: ?string,
): ((...rest: any) => Promise<B>) {
  const boundFetchJSON = (async (url: string, data: Object) => {
    return await fetchJSON(cookie, url, data);
  });
  return (async (...rest: any) => {
    return await actionFunc(boundFetchJSON, ...rest);
  });
}

// A memoized version of the above function, to make sure we don't trigger a
// React update unless the cookie actually changes
const createBoundServerCallSelector = <B>(
  actionFunc: (fetchJSON: FetchJSON, ...rest: any) => Promise<B>,
) => createSelector(
  (state: BaseAppState) => state.cookie,
  (cookie: ?string): ((...rest: any) => Promise<B>) =>
    bindServerCall(actionFunc, cookie),
);

export {
  includeDispatchActionProps,
  createBoundServerCallSelector,
};
