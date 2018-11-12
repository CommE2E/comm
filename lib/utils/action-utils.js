// @flow

import type {
  ActionPayload,
  Dispatch,
  PromisedAction,
  BaseAction,
} from '../types/redux-types';
import type { LoadingOptions, LoadingInfo } from '../types/loading-types';
import type { FetchJSON, FetchJSONOptions } from './fetch-json';
import type { RawThreadInfo } from '../types/thread-types';
import type { UserInfo, LoggedOutUserInfo } from '../types/user-types';
import type {
  LogInActionSource,
  LogInStartingPayload,
  LogInResult,
} from '../types/account-types';
import type { Endpoint, SocketAPIHandler } from '../types/endpoints';
import type { ClientSessionChange } from '../types/session-types';
import type { ConnectionStatus } from '../types/socket-types';

import invariant from 'invariant';
import _mapValues from 'lodash/fp/mapValues';
import { createSelector } from 'reselect';
import _memoize from 'lodash/memoize';

import fetchJSON from './fetch-json';
import { getConfig } from './config';
import { cookieInvalidationResolutionAttempt } from '../actions/user-actions';

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

function wrapActionPromise<
  AT: $Subtype<string>, // *_STARTED action type (string literal)
  AP: ActionPayload,    // *_STARTED payload
  BT: $Subtype<string>, // *_SUCCESS action type (string literal)
  BP: ActionPayload,    // *_SUCCESS payload
  CT: $Subtype<string>, // *_FAILED action type (string literal)
>(
  actionTypes: ActionTypes<AT, BT, CT>,
  promise: Promise<BP>,
  loadingOptions: ?LoadingOptions,
  startingPayload: ?AP,
): PromisedAction {
  const loadingInfo: LoadingInfo = {
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
          loadingInfo,
          payload: (startingPayload: AP),
        }
      : {
          type: (actionTypes.started: AT),
          loadingInfo,
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
  A: BaseAction,
  B: BaseAction,
  C: BaseAction,
>(
  actionTypes: ActionTypes<
    $PropertyType<A, 'type'>,
    $PropertyType<B, 'type'>,
    $PropertyType<C, 'type'>,
  >,
  promise: Promise<$PropertyType<B, 'payload'>>,
  loadingOptions?: LoadingOptions,
  startingPayload?: $PropertyType<A, 'payload'>,
) => Promise<void>;

type BoundActions = {
  dispatch: Dispatch,
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
};
function includeDispatchActionProps(dispatch: Dispatch): BoundActions {
  const dispatchActionPromise =
    function<A: BaseAction, B: BaseAction, C: BaseAction>(
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
}

let currentlyWaitingForNewCookie = false;
let fetchJSONCallsWaitingForNewCookie: ((fetchJSON: ?FetchJSON) => void)[] = [];

export type DispatchRecoveryAttempt = (
  actionTypes: ActionTypes<
    "LOG_IN_STARTED",
    "LOG_IN_SUCCESS",
    "LOG_IN_FAILED",
  >,
  promise: Promise<LogInResult>,
  startingPayload: LogInStartingPayload,
) => Promise<bool>;

const setNewSessionActionType = "SET_NEW_SESSION";
function setNewSession(
  dispatch: Dispatch,
  sessionChange: ClientSessionChange,
  error: ?string,
) {
  dispatch({
    type: setNewSessionActionType,
    payload: { sessionChange, error },
  });
}

// This function calls resolveInvalidatedCookie, which dispatchs a log in action
// using the native credentials. Note that we never actually specify a sessionID
// here, on the assumption that only native clients will call this. (Native
// clients don't specify a sessionID, indicating to the server that it should
// use the cookieID as the sessionID.)
async function fetchNewCookieFromNativeCredentials(
  dispatch: Dispatch,
  cookie: ?string,
  urlPrefix: string,
  source: LogInActionSource,
): Promise<?ClientSessionChange> {
  const resolveInvalidatedCookie = getConfig().resolveInvalidatedCookie;
  if (!resolveInvalidatedCookie) {
    return null;
  }
  let newSessionChange = null;
  let fetchJSONCallback = null;
  const boundFetchJSON = async (
    endpoint: Endpoint,
    data: {[key: string]: mixed},
    options?: ?FetchJSONOptions,
  ) => {
    const innerBoundSetNewSession = (
      sessionChange: ClientSessionChange,
      error: ?string,
    ) => {
      newSessionChange = sessionChange;
      setNewSession(dispatch, sessionChange, error);
    };
    try {
      const result = await fetchJSON(
        cookie,
        innerBoundSetNewSession,
        () => new Promise(r => r(null)),
        (sessionChange: ClientSessionChange) => new Promise(r => r(null)),
        urlPrefix,
        null,
        "disconnected",
        null,
        endpoint,
        data,
        options,
      );
      if (fetchJSONCallback) {
        fetchJSONCallback(!!newSessionChange);
      }
      return result;
    } catch(e) {
      if (fetchJSONCallback) {
        fetchJSONCallback(!!newSessionChange);
      }
      throw e;
    }
  };
  const dispatchRecoveryAttempt = (
    actionTypes: ActionTypes<
      "LOG_IN_STARTED",
      "LOG_IN_SUCCESS",
      "LOG_IN_FAILED",
    >,
    promise: Promise<LogInResult>,
    inputStartingPayload: LogInStartingPayload,
  ) => {
    const startingPayload = { ...inputStartingPayload, source };
    dispatch(wrapActionPromise(actionTypes, promise, null, startingPayload));
    return new Promise(r => fetchJSONCallback = r);
  };
  await resolveInvalidatedCookie(
    boundFetchJSON,
    dispatchRecoveryAttempt,
  );
  return newSessionChange;
}

// Third param is optional and gets called with newCookie if we get a new cookie
// Necessary to propagate cookie in cookieInvalidationRecovery below
function bindCookieAndUtilsIntoFetchJSON(params: BindServerCallsParams): FetchJSON {
  const {
    dispatch,
    cookie,
    urlPrefix,
    sessionID,
    loggedIn,
    connectionStatus,
  } = params;
  const boundSetNewSession = setNewSession.bind(null, dispatch);
  // This function gets called before fetchJSON sends a request, to make sure
  // that we're not in the middle of trying to recover an invalidated cookie
  const waitIfCookieInvalidated = () => {
    if (!getConfig().resolveInvalidatedCookie) {
      // If there is no resolveInvalidatedCookie function, just let the caller
      // fetchJSON instance continue
      return Promise.resolve(null);
    }
    if (!currentlyWaitingForNewCookie) {
      // Our cookie seems to be valid
      return Promise.resolve(null);
    }
    // Wait to run until we get our new cookie
    return new Promise(r => fetchJSONCallsWaitingForNewCookie.push(r));
  };
  // This function is a helper for the next function defined below
  const attemptToResolveInvalidation =
    async (sessionChange: ClientSessionChange) => {
      const newAnonymousCookie = sessionChange.cookie;
      const newSessionChange = await fetchNewCookieFromNativeCredentials(
        dispatch,
        newAnonymousCookie,
        urlPrefix,
        cookieInvalidationResolutionAttempt,
      );

      currentlyWaitingForNewCookie = false;
      const currentWaitingCalls = fetchJSONCallsWaitingForNewCookie;
      fetchJSONCallsWaitingForNewCookie = [];

      const newFetchJSON = newSessionChange
        ? bindCookieAndUtilsIntoFetchJSON({
            ...params,
            cookie: newSessionChange.cookie,
            sessionID: newSessionChange.sessionID,
          })
        : null;
      for (const func of currentWaitingCalls) {
        func(newFetchJSON);
      }
      return newFetchJSON;
    };
  // If this function is called, fetchJSON got a response invalidating its
  // cookie, and is wondering if it should just like... give up? Or if there's
  // a chance at redemption
  const cookieInvalidationRecovery = (sessionChange: ClientSessionChange) => {
    if (!getConfig().resolveInvalidatedCookie) {
      // If there is no resolveInvalidatedCookie function, just let the caller
      // fetchJSON instance continue
      return Promise.resolve(null);
    }
    if (!loggedIn) {
      // We don't want to attempt any use native credentials of a logged out
      // user to log-in after a cookieInvalidation while logged out
      return Promise.resolve(null);
    }
    if (currentlyWaitingForNewCookie) {
      return new Promise(r => fetchJSONCallsWaitingForNewCookie.push(r));
    }
    currentlyWaitingForNewCookie = true;
    return attemptToResolveInvalidation(sessionChange);
  };

  return (
    endpoint: Endpoint,
    data: Object,
    options?: ?FetchJSONOptions,
  ) => fetchJSON(
    cookie,
    boundSetNewSession,
    waitIfCookieInvalidated,
    cookieInvalidationRecovery,
    urlPrefix,
    sessionID,
    connectionStatus,
    socketAPIHandler,
    endpoint,
    data,
    options,
  );
}

type ActionFunc = (fetchJSON: FetchJSON, ...rest: $FlowFixMe) => Promise<*>;
type BindServerCallsParams = {|
  dispatch: Dispatch,
  cookie: ?string,
  urlPrefix: string,
  sessionID: ?string,
  loggedIn: bool,
  connectionStatus: ConnectionStatus,
|};

// All server calls needs to include some information from the Redux state
// (namely, the cookie). This information is used deep in the server call,
// at the point where fetchJSON is called. We don't want to bother propagating
// the cookie (and any future config info that fetchJSON needs) through to the
// server calls so they can pass it to fetchJSON. Instead, we "curry" the cookie
// onto fetchJSON within react-redux's connect's mapStateToProps function, and
// then pass that "bound" fetchJSON that no longer needs the cookie as a
// parameter on to the server call.
const baseCreateBoundServerCallsSelector = (actionFunc: ActionFunc) => {
  return createSelector(
    (state: BindServerCallsParams) => state.dispatch,
    (state: BindServerCallsParams) => state.cookie,
    (state: BindServerCallsParams) => state.urlPrefix,
    (state: BindServerCallsParams) => state.sessionID,
    (state: BindServerCallsParams) => state.loggedIn,
    (state: BindServerCallsParams) => state.connectionStatus,
    (
      dispatch: Dispatch,
      cookie: ?string,
      urlPrefix: string,
      sessionID: ?string,
      loggedIn: bool,
      connectionStatus: ConnectionStatus,
    ) => {
      const boundFetchJSON = bindCookieAndUtilsIntoFetchJSON({
        dispatch,
        cookie,
        urlPrefix,
        sessionID,
        loggedIn,
        connectionStatus,
      });
      return (...rest: $FlowFixMe) => actionFunc(boundFetchJSON, ...rest);
    },
  );
}
const createBoundServerCallsSelector = _memoize(baseCreateBoundServerCallsSelector);

type ServerCall = (fetchJSON: FetchJSON, ...rest: $FlowFixMe) => Promise<any>;
export type ServerCalls = {[name: string]: ServerCall};

function bindServerCalls(serverCalls: ServerCalls) {
  return (
    stateProps: {
      cookie: ?string,
      urlPrefix: string,
      sessionID: ?string,
      currentUserInfoLoggedIn: bool,
      connectionStatus: ConnectionStatus,
    },
    dispatchProps: Object,
    ownProps: {[propName: string]: mixed},
  ) => {
    const dispatch = dispatchProps.dispatch;
    invariant(dispatch, "should be defined");
    const {
      cookie,
      urlPrefix,
      sessionID,
      currentUserInfoLoggedIn: loggedIn,
      connectionStatus,
    } = stateProps;
    const boundServerCalls = _mapValues(
      (serverCall: (fetchJSON: FetchJSON, ...rest: any) => Promise<any>) =>
        createBoundServerCallsSelector(serverCall)({
          dispatch,
          cookie,
          urlPrefix,
          sessionID,
          loggedIn,
          connectionStatus,
        }),
    )(serverCalls);
    return {
      ...ownProps,
      ...stateProps,
      ...dispatchProps,
      ...boundServerCalls,
    };
  };
}

let socketAPIHandler: ?SocketAPIHandler = null;
function registerActiveSocket(passedSocketAPIHandler: ?SocketAPIHandler) {
  socketAPIHandler = passedSocketAPIHandler;
}

export {
  setNewSessionActionType,
  includeDispatchActionProps,
  fetchNewCookieFromNativeCredentials,
  bindServerCalls,
  registerActiveSocket,
};
