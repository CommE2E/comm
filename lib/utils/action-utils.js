// @flow

import type { Dispatch, BaseAppState, BaseAction } from '../types/redux-types';
import type { LoadingOptions, LoadingInfo } from '../types/loading-types';
import type { FetchJSON } from './fetch-json';

import invariant from 'invariant';
import _mapValues from 'lodash/fp/mapValues';

import fetchJSON from './fetch-json';
import { getConfig } from './config';

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
        ) => dispatch(wrapActionPromise(
          actionType,
          promise,
          loadingOptions,
          startingPayload,
        ));
    }
    if (whichOnes.dispatchActionPayload) {
      boundActions.dispatchActionPayload =
        (actionType: string, payload: P) => {
          dispatch({ type: actionType, payload });
        };
    }
    return boundActions;
  };
}

let currentlyWaitingForNewCookie = false;
let fetchJSONCallsWaitingForNewCookie: ((fetchJSON: ?FetchJSON) => void)[] = [];

export type DispatchRecoveryAttempt =
  (actionType: string, promise: Promise<*>) => Promise<?string>;

function setCookie(
  dispatch: (action: BaseAction) => BaseAction,
  currentCookie: ?string,
  newCookie: ?string,
  response: ?Object,
) {
  if (newCookie === currentCookie) {
    return;
  }
  if (response) {
    invariant(
      response.cookie_change &&
        response.cookie_change.thread_infos &&
        typeof response.cookie_change.cookie_invalidated === "boolean",
      "all server calls that return a new cookie should include a valid " +
        "cookie_change object in their payload",
    );
    dispatch({
      type: "SET_COOKIE",
      payload: {
        cookie: newCookie,
        calendarInfos: response.cookie_change.thread_infos,
        cookieInvalidated: response.cookie_change.cookie_invalidated,
      },
    });
  } else {
    dispatch({
      type: "SET_COOKIE",
      payload: { cookie: newCookie },
    });
  }
}

async function fetchNewCookieFromNativeCredentials<T: BaseAppState, A>(
  dispatch: Dispatch<T, A>,
  cookie: ?string,
  source: ?string,
): Promise<?string> {
  let newValidCookie = null;
  let fetchJSONCallback = null;
  const boundFetchJSON = async (
    url: string,
    data: {[key: string]: mixed},
  ) => {
    const innerBoundSetCookie = (newCookie: ?string, response: Object) => {
      if (newCookie !== cookie) {
        newValidCookie = newCookie;
      }
      setCookie(dispatch, cookie, newCookie, response);
    };
    try {
      const result = await fetchJSON(
        cookie,
        innerBoundSetCookie,
        () => new Promise(r => r(null)),
        (someCookie: ?string) => new Promise(r => r(null)),
        url,
        data,
      );
      if (fetchJSONCallback) {
        fetchJSONCallback(newValidCookie);
      }
      return result;
    } catch(e) {
      if (fetchJSONCallback) {
        fetchJSONCallback(newValidCookie);
      }
      throw e;
    }
  };
  const startingPayload = source ? { source } : null;
  const dispatchRecoveryAttempt = (
    actionType: string,
    promise: Promise<*>,
  ) => {
    dispatch(wrapActionPromise(actionType, promise, null, startingPayload));
    return new Promise(r => fetchJSONCallback = r);
  };
  const resolveInvalidatedCookie = getConfig().resolveInvalidatedCookie;
  invariant(
    resolveInvalidatedCookie,
    "cookieInvalidationRecovery should check this before it calls us",
  );
  await resolveInvalidatedCookie(boundFetchJSON, dispatchRecoveryAttempt);
  return newValidCookie;
}

// Third param is optional and gets called with newCookie if we get a new cookie
// Necessary to propagate cookie in cookieInvalidationRecovery below
function bindCookieAndUtilsIntoFetchJSON<T: BaseAppState, A>(
  dispatch: Dispatch<T, A>,
  cookie: ?string,
): FetchJSON {
  const boundSetCookie = (newCookie: ?string, response: Object) => {
    setCookie(dispatch, cookie, newCookie, response);
  };
  // This function gets called before fetchJSON sends a request, to make sure
  // that we're not in the middle of trying to recover an invalidated cookie
  const waitIfCookieInvalidated = () => {
    if (!getConfig().resolveInvalidatedCookie) {
      // If there is no resolveInvalidatedCookie function, just let the caller
      // fetchJSON instance continue
      return new Promise(r => r(null));
    }
    if (!currentlyWaitingForNewCookie) {
      // Our cookie seems to be valid
      return new Promise(r => r(null));
    }
    // Wait to run until we get our new cookie
    return new Promise(r => fetchJSONCallsWaitingForNewCookie.push(r));
  };
  // This function is a helper for the next function defined below
  const attemptToResolveInvalidation = async (newAnonymousCookie: ?string) => {
    const newValidCookie = await fetchNewCookieFromNativeCredentials(
      dispatch,
      newAnonymousCookie,
      "COOKIE_INVALIDATION_RESOLUTION_ATTEMPT",
    );

    currentlyWaitingForNewCookie = false;
    const currentWaitingCalls = fetchJSONCallsWaitingForNewCookie;
    fetchJSONCallsWaitingForNewCookie = [];

    const newFetchJSON = newValidCookie
      ? bindCookieAndUtilsIntoFetchJSON(dispatch, newValidCookie)
      : null;
    for (const func of currentWaitingCalls) {
      func(newFetchJSON);
    }
    return newFetchJSON;
  };
  // If this function is called, fetchJSON got a response invalidating its
  // cookie, and is wondering if it should just like... give up? Or if there's
  // a chance at redemption
  const cookieInvalidationRecovery = (newAnonymousCookie: ?string) => {
    if (!getConfig().resolveInvalidatedCookie) {
      // If there is no resolveInvalidatedCookie function, just let the caller
      // fetchJSON instance continue
      return new Promise(r => r(null));
    }
    if (currentlyWaitingForNewCookie) {
      return new Promise(r => fetchJSONCallsWaitingForNewCookie.push(r));
    }
    currentlyWaitingForNewCookie = true;
    return attemptToResolveInvalidation(newAnonymousCookie);
  };

  return (async (url: string, data: Object) => {
    return await fetchJSON(
      cookie,
      boundSetCookie,
      waitIfCookieInvalidated,
      cookieInvalidationRecovery,
      url,
      data,
    );
  });
}

// All server calls needs to include some information from the Redux state
// (namely, the cookie). This information is used deep in the server call,
// at the point where fetchJSON is called. We don't want to bother propagating
// the cookie (and any future config info that fetchJSON needs) through to the
// server calls so they can pass it to fetchJSON. Instead, we "curry" the cookie
// onto fetchJSON within react-redux's connect's mapStateToProps function, and
// then pass that "bound" fetchJSON that no longer needs the cookie as a
// parameter on to the server call.
function bindCookieAndUtilsIntoServerCall<T: BaseAppState, A, B>(
  actionFunc: (fetchJSON: FetchJSON, ...rest: any) => Promise<B>,
  dispatch: Dispatch<T, A>,
  cookie: ?string,
): (...rest: any) => Promise<B> {
  const boundFetchJSON = bindCookieAndUtilsIntoFetchJSON(dispatch, cookie);
  return (async (...rest: any) => {
    return await actionFunc(boundFetchJSON, ...rest);
  });
}

function bindServerCalls(
  serverCalls:
    {[name: string]: (fetchJSON: FetchJSON, ...rest: any) => Promise<any>},
) {
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
  fetchNewCookieFromNativeCredentials,
  bindCookieAndUtilsIntoServerCall,
  bindServerCalls,
  setCookie,
};
