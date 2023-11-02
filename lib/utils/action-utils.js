// @flow

import invariant from 'invariant';
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
import { promiseAll } from './promises.js';
import { ashoatKeyserverID } from './validation-utils.js';
import { serverCallStateSelector } from '../selectors/server-calls.js';
import {
  logInActionSources,
  type LogInActionSource,
  type LogInStartingPayload,
  type LogInResult,
} from '../types/account-types.js';
import type { PlatformDetails } from '../types/device-types.js';
import type { Endpoint, SocketAPIHandler } from '../types/endpoints.js';
import type { CalendarQuery } from '../types/entry-types.js';
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

function extractKeyserverIDFromID(id: string): string {
  return id.split('|')[0];
}

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
  keyserverID: string,
  getInitialNotificationsEncryptedMessage?: () => Promise<string>,
): Promise<?ClientSessionChange> {
  const resolveInvalidatedCookie = getConfig().resolveInvalidatedCookie;
  if (!resolveInvalidatedCookie) {
    return null;
  }
  let newSessionChange = null;
  let callServerEndpointCallback = null;
  const boundCallServerEndpoint = async (
    endpoint: Endpoint,
    data: { +[key: string]: mixed },
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
        null,
        endpoint,
        data,
        dispatch,
        options,
        false,
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

  const boundCallKeyserverEndpoint = (
    endpoint: Endpoint,
    requests: { +[keyserverID: string]: ?{ +[string]: mixed } },
    options?: ?CallServerEndpointOptions,
  ) => {
    if (requests[keyserverID]) {
      const promises = {
        [keyserverID]: boundCallServerEndpoint(
          endpoint,
          requests[keyserverID],
          options,
        ),
      };
      return promiseAll(promises);
    }
    return Promise.resolve({});
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
    boundCallKeyserverEndpoint,
    dispatchRecoveryAttempt,
    logInActionSource,
    keyserverID,
    getInitialNotificationsEncryptedMessage,
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
    lastCommunicatedPlatformDetails,
    keyserverID,
  } = params;
  const loggedIn = !!(currentUserInfo && !currentUserInfo.anonymous && true);
  const boundSetNewSession = (
    sessionChange: ClientSessionChange,
    error: ?string,
  ) =>
    setNewSession(
      dispatch,
      sessionChange,
      {
        currentUserInfo,
        cookiesAndSessions: { [keyserverID]: { cookie, sessionID } },
      },
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
      keyserverID,
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
      lastCommunicatedPlatformDetails,
      socketAPIHandler,
      endpoint,
      data,
      dispatch,
      options,
      loggedIn,
    );
}

export type ActionFunc<F> = (callServerEndpoint: CallServerEndpoint) => F;
export type BindServerCall = <F>(serverCall: ActionFunc<F>) => F;
export type BindServerCallsParams = {
  +dispatch: Dispatch,
  +cookie: ?string,
  +urlPrefix: string,
  +sessionID: ?string,
  +currentUserInfo: ?CurrentUserInfo,
  +connectionStatus: ConnectionStatus,
  +lastCommunicatedPlatformDetails: ?PlatformDetails,
  +keyserverID: string,
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
    (state: BindServerCallsParams) => state.lastCommunicatedPlatformDetails,
    (state: BindServerCallsParams) => state.keyserverID,
    (
      dispatch: Dispatch,
      cookie: ?string,
      urlPrefix: string,
      sessionID: ?string,
      currentUserInfo: ?CurrentUserInfo,
      connectionStatus: ConnectionStatus,
      lastCommunicatedPlatformDetails: ?PlatformDetails,
      keyserverID: string,
    ) => {
      const boundCallServerEndpoint = bindCookieAndUtilsIntoCallServerEndpoint({
        dispatch,
        cookie,
        urlPrefix,
        sessionID,
        currentUserInfo,
        connectionStatus,
        lastCommunicatedPlatformDetails,
        keyserverID,
      });
      return actionFunc(boundCallServerEndpoint);
    },
  );

type CreateBoundServerCallsSelectorType = <F>(
  ActionFunc<F>,
) => BindServerCallsParams => F;
const createBoundServerCallsSelector: CreateBoundServerCallsSelectorType =
  (_memoize(baseCreateBoundServerCallsSelector): any);

function useServerCall<F>(
  serverCall: ActionFunc<F>,
  paramOverride?: ?$Shape<BindServerCallsParams>,
): F {
  const dispatch = useDispatch();
  const serverCallState = useSelector(
    serverCallStateSelector(ashoatKeyserverID),
  );
  return React.useMemo(() => {
    const { urlPrefix: urlPrefixFromState, connectionStatus } = serverCallState;
    const { urlPrefix: urlPrefixOverride, ...restOverrides } =
      paramOverride ?? {};

    const urlPrefix = urlPrefixOverride ?? urlPrefixFromState;
    invariant(
      !!urlPrefix && !!connectionStatus,
      'urlPrefix or connectionStatus is missing',
    );

    return createBoundServerCallsSelector(serverCall)({
      ...serverCallState,
      urlPrefix,
      connectionStatus,
      dispatch,
      ...restOverrides,
      keyserverID: ashoatKeyserverID,
    });
  }, [serverCall, serverCallState, dispatch, paramOverride]);
}

let socketAPIHandler: ?SocketAPIHandler = null;
function registerActiveSocket(passedSocketAPIHandler: ?SocketAPIHandler) {
  socketAPIHandler = passedSocketAPIHandler;
}

function sortThreadIDsPerKeyserver(threadIDs: $ReadOnlyArray<string>): {
  +[keyserverID: string]: $ReadOnlyArray<string>,
} {
  const results = {};
  for (const threadID of threadIDs) {
    const keyserverID = extractKeyserverIDFromID(threadID);
    invariant(keyserverID, 'keyserver data missing from thread id');
    if (results[keyserverID] === undefined) {
      results[keyserverID] = [];
    }
    results[keyserverID].push(threadID);
  }
  return results;
}

function sortCalendarQueryPerKeyserver(
  calendarQuery: CalendarQuery,
  keyserverIDs: $ReadOnlyArray<string>,
): {
  +[keyserverID: string]: CalendarQuery,
} {
  const { startDate, endDate, filters } = calendarQuery;
  const results = {};

  for (const keyserverID of keyserverIDs) {
    results[keyserverID] = {
      startDate,
      endDate,
      filters: [],
    };
  }

  for (const filter of filters) {
    if (filter.type === 'not_deleted') {
      for (const keyserverID in results) {
        results[keyserverID].filters.push({ type: 'not_deleted' });
      }
    } else if (filter.type === 'threads') {
      for (const threadID of filter.threadIDs) {
        const keyserverID = extractKeyserverIDFromID(threadID);
        if (results[keyserverID] === undefined) {
          continue;
        }
        let threadFilter = results[keyserverID].filters.find(
          flt => flt.type === 'threads',
        );
        if (!threadFilter) {
          threadFilter = { type: 'threads', threadIDs: [] };
          results[keyserverID].filters.push(threadFilter);
        }

        threadFilter.threadIDs.push(threadID);
      }
    } else {
      console.warn('unhandled filter in sortCalendarQueryPerKeyserver');
    }
  }

  return results;
}

export {
  useDispatchActionPromise,
  setNewSessionActionType,
  fetchNewCookieFromNativeCredentials,
  createBoundServerCallsSelector,
  registerActiveSocket,
  useServerCall,
  bindCookieAndUtilsIntoCallServerEndpoint,
  extractKeyserverIDFromID,
  sortThreadIDsPerKeyserver,
  sortCalendarQueryPerKeyserver,
};
