// @flow

import type {
  ActionPayload,
  Dispatch,
  PromisedAction,
  SuperAction,
} from '../types/redux-types';
import type { LoadingOptions, LoadingInfo } from '../types/loading-types';
import type { FetchJSON } from './fetch-json';
import type {
  LogInResult,
  LogInStartingPayload,
} from '../actions/user-actions';

import invariant from 'invariant';
import _mapValues from 'lodash/fp/mapValues';

import fetchJSON from './fetch-json';
import { getConfig } from './config';

let nextPromiseIndex = 0;

export type ActionTypes<
  AT: $Subtype<string>,
  BT: $Subtype<string>,
  CT: $Subtype<string>,
> = {
  started: AT,
  success: BT,
  failed: CT,
};

type ActionSupportingPromise<
  AT: $Subtype<string>,
  AP: ActionPayload,
  BT: $Subtype<string>,
  BP: ActionPayload,
  CT: $Subtype<string>,
> =
  { type: AT, loadingInfo: LoadingInfo, payload?: AP } |
  { type: BT, loadingInfo: LoadingInfo, payload?: BP } |
  { type: CT, loadingInfo: LoadingInfo, payload: Error } |
  { type: AT, payload?: AP };

function wrapActionPromise<
  AT: $Subtype<string>, // *_STARTED action type (string literal)
  AP: ActionPayload,    // *_STARTED payload
  BT: $Subtype<string>, // *_SUCCESS action type (string literal)
  BP: ActionPayload,    // *_SUCCESS payload
  CT: $Subtype<string>, // *_FAILED action type (string literal)
>(
  actionTypes: ActionTypes<AT, BT, CT>,
  promise: Promise<BP>,
  loadingOptions?: ?LoadingOptions,
  startingPayload?: ?AP,
): PromisedAction {
  const loadingInfo = {
    fetchIndex: nextPromiseIndex++,
    trackMultipleRequests:
      !!(loadingOptions && loadingOptions.trackMultipleRequests),
    customKeyName: loadingOptions && loadingOptions.customKeyName
      ? loadingOptions.customKeyName
      : null,
  };
  return (async (dispatch: Dispatch): Promise<void> => {
    const startAction = startingPayload
      ? {
          type: (actionTypes.started: AT),
          loadingInfo: (loadingInfo: LoadingInfo),
          payload: (startingPayload: AP),
        }
      : {
          type: (actionTypes.started: AT),
          loadingInfo: (loadingInfo: LoadingInfo),
        };
    dispatch(startAction);
    try {
      const result = await promise;
      dispatch({
        type: (actionTypes.success: BT),
        payload: (result: BP),
        loadingInfo,
      });
    } catch (e) {
      console.log(e);
      dispatch({
        type: (actionTypes.failed: CT),
        error: true,
        payload: (e: Error),
        loadingInfo,
      });
    }
  });
}

export type DispatchActionPayload =
  <T: $Subtype<string>, P: ActionPayload>(actionType: T, payload: P) => void;
export type DispatchActionPromise = <
  AT: $Subtype<string>, // *_STARTED action type (string literal)
  AP: ActionPayload,    // *_STARTED payload
  BT: $Subtype<string>, // *_SUCCESS action type (string literal)
  BP: ActionPayload,    // *_SUCCESS payload
  CT: $Subtype<string>, // *_FAILED action type (string literal)
>(
  actionTypes: ActionTypes<AT, BT, CT>,
  promise: Promise<BP>,
  loadingOptions?: LoadingOptions,
  startingPayload?: AP,
) => Promise<void>;

type DispatchActionHelperProps = {
  dispatchActionPayload?: bool,
  dispatchActionPromise?: bool,
};
type BoundActions = {
  dispatch: Dispatch,
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
};
function includeDispatchActionProps(
  whichOnes: DispatchActionHelperProps,
): (dispatch: Dispatch) => BoundActions {
  return (dispatch: Dispatch) => {
    const dispatchActionPromise =
      function<A: SuperAction, B: SuperAction, C: SuperAction>(
        actionTypes: ActionTypes<
          $PropertyType<A, 'type'>,
          $PropertyType<B, 'type'>,
          $PropertyType<C, 'type'>,
        >,
        promise: Promise<$PropertyType<B, 'payload'>>,
        loadingOptions?: LoadingOptions,
        startingPayload?: $PropertyType<A, 'payload'>,
      ): Promise<void> {
        return dispatch(wrapActionPromise(
          actionTypes,
          promise,
          loadingOptions,
          startingPayload,
        ));
      };
    const dispatchActionPayload =
      function<T: $Subtype<string>, P: ActionPayload>(
        actionType: T,
        payload: P,
      ) {
        const action = { type: actionType, payload };
        dispatch(action);
      };
    return { dispatch, dispatchActionPayload, dispatchActionPromise };
  };
}

let currentlyWaitingForNewCookie = false;
let fetchJSONCallsWaitingForNewCookie: ((fetchJSON: ?FetchJSON) => void)[] = [];

export type DispatchRecoveryAttempt = (
  actionTypes: ActionTypes<
    'LOG_IN_STARTED',
    'LOG_IN_SUCCESS',
    'LOG_IN_FAILED'
  >,
  promise: Promise<LogInResult>,
) => Promise<?string>;

function setCookie(
  dispatch: Dispatch,
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
        threadInfos: response.cookie_change.thread_infos,
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

async function fetchNewCookieFromNativeCredentials(
  dispatch: Dispatch,
  cookie: ?string,
  source: null |
    "COOKIE_INVALIDATION_RESOLUTION_ATTEMPT" |
    "APP_START_NATIVE_CREDENTIALS_AUTO_LOG_IN" |
    "APP_START_REDUX_LOGGED_IN_BUT_INVALID_COOKIE",
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
  const startingPayload: ?LogInStartingPayload = source ? { source } : null;
  const dispatchRecoveryAttempt = (
    actionTypes: ActionTypes<
      'LOG_IN_STARTED',
      'LOG_IN_SUCCESS',
      'LOG_IN_FAILED',
    >,
    promise: Promise<LogInResult>,
  ) => {
    dispatch(wrapActionPromise(actionTypes, promise, null, startingPayload));
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
function bindCookieAndUtilsIntoFetchJSON(
  dispatch: Dispatch,
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
function bindCookieAndUtilsIntoServerCall<P>(
  actionFunc: (fetchJSON: FetchJSON, ...rest: $FlowFixMe) => Promise<P>,
  dispatch: Dispatch,
  cookie: ?string,
): (...rest: $FlowFixMe) => Promise<P> {
  const boundFetchJSON = bindCookieAndUtilsIntoFetchJSON(dispatch, cookie);
  return (async (...rest: $FlowFixMe) => {
    return await actionFunc(boundFetchJSON, ...rest);
  });
}

function bindServerCalls(
  serverCalls: {[name: string]:
    (fetchJSON: FetchJSON, ...rest: $FlowFixMe) => Promise<any>},
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
