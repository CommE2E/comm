// @flow

import _memoize from 'lodash/memoize.js';
import * as React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { createSelector } from 'reselect';

import callServerEndpoint from './call-server-endpoint.js';
import type {
  CallServerEndpoint,
  CallServerEndpointOptions,
} from './call-server-endpoint.js';
import { getConfig } from './config.js';
import { serverCallStateSelector } from '../selectors/server-calls.js';
import {
  logInActionSources,
  type LogInActionSource,
  type LogInStartingPayload,
  type LogInResult,
} from '../types/account-types.js';
import type { Endpoint, SocketAPIHandler } from '../types/endpoints.js';
import type { LoadingOptions, LoadingInfo } from '../types/loading-types.js';
import type {
  ActionPayload,
  Dispatch,
  PromisedAction,
  BaseAction,
} from '../types/redux-types.js';
import type {
  ClientSessionChange,
  PreRequestUserState,
} from '../types/session-types.js';
import type { ConnectionStatus } from '../types/socket-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';

let nextPromiseIndex = 0;

export type ActionTypes<
  STARTED_ACTION_TYPE: string,
  SUCCESS_ACTION_TYPE: string,
  FAILED_ACTION_TYPE: string,
> = {
  started: STARTED_ACTION_TYPE,
  success: SUCCESS_ACTION_TYPE,
  failed: FAILED_ACTION_TYPE,
};

function wrapActionPromise<
  STARTED_ACTION_TYPE: string,
  STARTED_PAYLOAD: ActionPayload,
  SUCCESS_ACTION_TYPE: string,
  SUCCESS_PAYLOAD: ActionPayload,
  FAILED_ACTION_TYPE: string,
>(
  actionTypes: ActionTypes<
    STARTED_ACTION_TYPE,
    SUCCESS_ACTION_TYPE,
    FAILED_ACTION_TYPE,
  >,
  promise: Promise<SUCCESS_PAYLOAD>,
  loadingOptions: ?LoadingOptions,
  startingPayload: ?STARTED_PAYLOAD,
): PromisedAction {
  const loadingInfo: LoadingInfo = {
    fetchIndex: nextPromiseIndex++,
    trackMultipleRequests: !!loadingOptions?.trackMultipleRequests,
    customKeyName: loadingOptions?.customKeyName || null,
  };
  return async (dispatch: Dispatch): Promise<void> => {
    const startAction = startingPayload
      ? {
          type: (actionTypes.started: STARTED_ACTION_TYPE),
          loadingInfo,
          payload: (startingPayload: STARTED_PAYLOAD),
        }
      : {
          type: (actionTypes.started: STARTED_ACTION_TYPE),
          loadingInfo,
        };
    dispatch(startAction);
    try {
      const result = await promise;
      dispatch({
        type: (actionTypes.success: SUCCESS_ACTION_TYPE),
        payload: (result: SUCCESS_PAYLOAD),
        loadingInfo,
      });
    } catch (e) {
      console.log(e);
      dispatch({
        type: (actionTypes.failed: FAILED_ACTION_TYPE),
        error: true,
        payload: (e: Error),
        loadingInfo,
      });
    }
  };
}

export type DispatchActionPromise = <
  STARTED: BaseAction,
  SUCCESS: BaseAction,
  FAILED: BaseAction,
>(
  actionTypes: ActionTypes<
    $PropertyType<STARTED, 'type'>,
    $PropertyType<SUCCESS, 'type'>,
    $PropertyType<FAILED, 'type'>,
  >,
  promise: Promise<$PropertyType<SUCCESS, 'payload'>>,
  loadingOptions?: LoadingOptions,
  startingPayload?: $PropertyType<STARTED, 'payload'>,
) => Promise<void>;

function useDispatchActionPromise(): DispatchActionPromise {
  const dispatch = useDispatch();
  return React.useMemo(() => createDispatchActionPromise(dispatch), [dispatch]);
}

function createDispatchActionPromise(dispatch: Dispatch) {
  const dispatchActionPromise = function <
    STARTED: BaseAction,
    SUCCESS: BaseAction,
    FAILED: BaseAction,
  >(
    actionTypes: ActionTypes<
      $PropertyType<STARTED, 'type'>,
      $PropertyType<SUCCESS, 'type'>,
      $PropertyType<FAILED, 'type'>,
    >,
    promise: Promise<$PropertyType<SUCCESS, 'payload'>>,
    loadingOptions?: LoadingOptions,
    startingPayload?: $PropertyType<STARTED, 'payload'>,
  ): Promise<void> {
    return dispatch(
      wrapActionPromise(actionTypes, promise, loadingOptions, startingPayload),
    );
  };
  return dispatchActionPromise;
}

export type DispatchFunctions = {
  +dispatch: Dispatch,
  +dispatchActionPromise: DispatchActionPromise,
};

let currentlyWaitingForNewCookie = false;
let serverEndpointCallsWaitingForNewCookie: ((
  callServerEndpoint: ?CallServerEndpoint,
) => void)[] = [];

export type DispatchRecoveryAttempt = (
  actionTypes: ActionTypes<'LOG_IN_STARTED', 'LOG_IN_SUCCESS', 'LOG_IN_FAILED'>,
  promise: Promise<LogInResult>,
  startingPayload: LogInStartingPayload,
) => Promise<boolean>;

const setNewSessionActionType = 'SET_NEW_SESSION';
function setNewSession(
  dispatch: Dispatch,
  sessionChange: ClientSessionChange,
  preRequestUserState: ?PreRequestUserState,
  error: ?string,
  logInActionSource: ?LogInActionSource,
) {
  dispatch({
    type: setNewSessionActionType,
    payload: { sessionChange, preRequestUserState, error, logInActionSource },
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
  logInActionSource: LogInActionSource,
): Promise<?ClientSessionChange> {
  const resolveInvalidatedCookie = getConfig().resolveInvalidatedCookie;
  if (!resolveInvalidatedCookie) {
    return null;
  }
  let newSessionChange = null;
  let callServerEndpointCallback = null;
  const boundCallServerEndpoint = async (
    endpoint: Endpoint,
    data: { [key: string]: mixed },
    options?: ?CallServerEndpointOptions,
  ) => {
    const innerBoundSetNewSession = (
      sessionChange: ClientSessionChange,
      error: ?string,
    ) => {
      newSessionChange = sessionChange;
      setNewSession(dispatch, sessionChange, null, error, logInActionSource);
    };
    try {
      const result = await callServerEndpoint(
        cookie,
        innerBoundSetNewSession,
        () => new Promise(r => r(null)),
        () => new Promise(r => r(null)),
        urlPrefix,
        null,
        'disconnected',
        null,
        endpoint,
        data,
        dispatch,
        options,
      );
      if (callServerEndpointCallback) {
        callServerEndpointCallback(!!newSessionChange);
      }
      return result;
    } catch (e) {
      if (callServerEndpointCallback) {
        callServerEndpointCallback(!!newSessionChange);
      }
      throw e;
    }
  };
  const dispatchRecoveryAttempt = (
    actionTypes: ActionTypes<
      'LOG_IN_STARTED',
      'LOG_IN_SUCCESS',
      'LOG_IN_FAILED',
    >,
    promise: Promise<LogInResult>,
    inputStartingPayload: LogInStartingPayload,
  ) => {
    const startingPayload = { ...inputStartingPayload, logInActionSource };
    dispatch(wrapActionPromise(actionTypes, promise, null, startingPayload));
    return new Promise(r => (callServerEndpointCallback = r));
  };
  await resolveInvalidatedCookie(
    boundCallServerEndpoint,
    dispatchRecoveryAttempt,
    logInActionSource,
  );
  return newSessionChange;
}

// Third param is optional and gets called with newCookie if we get a new cookie
// Necessary to propagate cookie in cookieInvalidationRecovery below
function bindCookieAndUtilsIntoCallServerEndpoint(
  params: BindServerCallsParams,
): CallServerEndpoint {
  const {
    dispatch,
    cookie,
    urlPrefix,
    sessionID,
    currentUserInfo,
    connectionStatus,
  } = params;
  const loggedIn = !!(currentUserInfo && !currentUserInfo.anonymous && true);
  const boundSetNewSession = (
    sessionChange: ClientSessionChange,
    error: ?string,
  ) =>
    setNewSession(
      dispatch,
      sessionChange,
      { currentUserInfo, cookie, sessionID },
      error,
      undefined,
    );
  // This function gets called before callServerEndpoint sends a request,
  // to make sure that we're not in the middle of trying to recover
  // an invalidated cookie
  const waitIfCookieInvalidated = () => {
    if (!getConfig().resolveInvalidatedCookie) {
      // If there is no resolveInvalidatedCookie function, just let the caller
      // callServerEndpoint instance continue
      return Promise.resolve(null);
    }
    if (!currentlyWaitingForNewCookie) {
      // Our cookie seems to be valid
      return Promise.resolve(null);
    }
    // Wait to run until we get our new cookie
    return new Promise(r => serverEndpointCallsWaitingForNewCookie.push(r));
  };
  // This function is a helper for the next function defined below
  const attemptToResolveInvalidation = async (
    sessionChange: ClientSessionChange,
  ) => {
    const newAnonymousCookie = sessionChange.cookie;
    const newSessionChange = await fetchNewCookieFromNativeCredentials(
      dispatch,
      newAnonymousCookie,
      urlPrefix,
      logInActionSources.cookieInvalidationResolutionAttempt,
    );

    currentlyWaitingForNewCookie = false;
    const currentWaitingCalls = serverEndpointCallsWaitingForNewCookie;
    serverEndpointCallsWaitingForNewCookie = [];

    const newCallServerEndpoint = newSessionChange
      ? bindCookieAndUtilsIntoCallServerEndpoint({
          ...params,
          cookie: newSessionChange.cookie,
          sessionID: newSessionChange.sessionID,
          currentUserInfo: newSessionChange.currentUserInfo,
        })
      : null;
    for (const func of currentWaitingCalls) {
      func(newCallServerEndpoint);
    }
    return newCallServerEndpoint;
  };
  // If this function is called, callServerEndpoint got a response invalidating
  // its cookie, and is wondering if it should just like... give up?
  // Or if there's a chance at redemption
  const cookieInvalidationRecovery = (sessionChange: ClientSessionChange) => {
    if (!getConfig().resolveInvalidatedCookie) {
      // If there is no resolveInvalidatedCookie function, just let the caller
      // callServerEndpoint instance continue
      return Promise.resolve(null);
    }
    if (!loggedIn) {
      // We don't want to attempt any use native credentials of a logged out
      // user to log-in after a cookieInvalidation while logged out
      return Promise.resolve(null);
    }
    if (currentlyWaitingForNewCookie) {
      return new Promise(r => serverEndpointCallsWaitingForNewCookie.push(r));
    }
    currentlyWaitingForNewCookie = true;
    return attemptToResolveInvalidation(sessionChange);
  };

  return (
    endpoint: Endpoint,
    data: Object,
    options?: ?CallServerEndpointOptions,
  ) =>
    callServerEndpoint(
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
      dispatch,
      options,
    );
}

export type ActionFunc<F> = (callServerEndpoint: CallServerEndpoint) => F;
export type BindServerCall = <F>(serverCall: ActionFunc<F>) => F;
type BindServerCallsParams = {
  dispatch: Dispatch,
  cookie: ?string,
  urlPrefix: string,
  sessionID: ?string,
  currentUserInfo: ?CurrentUserInfo,
  connectionStatus: ConnectionStatus,
};

// All server calls needs to include some information from the Redux state
// (namely, the cookie). This information is used deep in the server call,
// at the point where callServerEndpoint is called. We don't want to bother
// propagating the cookie (and any future config info that callServerEndpoint
// needs) through to the server calls so they can pass it to callServerEndpoint.
// Instead, we "curry" the cookie onto callServerEndpoint within react-redux's
// connect's mapStateToProps function, and then pass that "bound"
// callServerEndpoint that no longer needs the cookie as a parameter on to
// the server call.
const baseCreateBoundServerCallsSelector = <F>(
  actionFunc: ActionFunc<F>,
): (BindServerCallsParams => F) =>
  createSelector(
    (state: BindServerCallsParams) => state.dispatch,
    (state: BindServerCallsParams) => state.cookie,
    (state: BindServerCallsParams) => state.urlPrefix,
    (state: BindServerCallsParams) => state.sessionID,
    (state: BindServerCallsParams) => state.currentUserInfo,
    (state: BindServerCallsParams) => state.connectionStatus,
    (
      dispatch: Dispatch,
      cookie: ?string,
      urlPrefix: string,
      sessionID: ?string,
      currentUserInfo: ?CurrentUserInfo,
      connectionStatus: ConnectionStatus,
    ) => {
      const boundCallServerEndpoint = bindCookieAndUtilsIntoCallServerEndpoint({
        dispatch,
        cookie,
        urlPrefix,
        sessionID,
        currentUserInfo,
        connectionStatus,
      });
      return actionFunc(boundCallServerEndpoint);
    },
  );

type CreateBoundServerCallsSelectorType = <F>(
  ActionFunc<F>,
) => BindServerCallsParams => F;
const createBoundServerCallsSelector: CreateBoundServerCallsSelectorType =
  (_memoize(baseCreateBoundServerCallsSelector): any);

function useServerCall<F>(serverCall: ActionFunc<F>): F {
  const dispatch = useDispatch();
  const serverCallState = useSelector(serverCallStateSelector);
  return React.useMemo(
    () =>
      createBoundServerCallsSelector(serverCall)({
        ...serverCallState,
        dispatch,
      }),
    [serverCall, dispatch, serverCallState],
  );
}

let socketAPIHandler: ?SocketAPIHandler = null;
function registerActiveSocket(passedSocketAPIHandler: ?SocketAPIHandler) {
  socketAPIHandler = passedSocketAPIHandler;
}

export {
  useDispatchActionPromise,
  setNewSessionActionType,
  fetchNewCookieFromNativeCredentials,
  createBoundServerCallsSelector,
  registerActiveSocket,
  useServerCall,
};
