// @flow

import invariant from 'invariant';
import * as React from 'react';
import { createSelector } from 'reselect';

import { setNewSession } from './keyserver-conn-types.js';
import {
  canResolveKeyserverSessionInvalidation,
  resolveKeyserverSessionInvalidation,
} from './recovery-utils.js';
import { logInActionSources } from '../types/account-types.js';
import type { PlatformDetails } from '../types/device-types.js';
import type { Endpoint, SocketAPIHandler } from '../types/endpoints.js';
import type { Dispatch } from '../types/redux-types.js';
import type { ClientSessionChange } from '../types/session-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';
import type {
  CallServerEndpoint,
  CallServerEndpointOptions,
} from '../utils/call-server-endpoint.js';
import callServerEndpoint from '../utils/call-server-endpoint.js';

export type ActionFunc<F> = (callServerEndpoint: CallServerEndpoint) => F;
type CreateBoundServerCallsSelectorType = (
  keyserverID: string,
) => <F>(ActionFunc<F>) => ServerCallSelectorParams => F;
type CallKeyserverEndpointContextType = {
  +bindCookieAndUtilsIntoCallServerEndpoint: (
    params: BindServerCallsParams,
  ) => CallServerEndpoint,
  +createBoundServerCallsSelector: CreateBoundServerCallsSelectorType,
};

const CallKeyserverEndpointContext: React.Context<?CallKeyserverEndpointContextType> =
  React.createContext();

type OngoingRecoveryAttempt = {
  +waitingCalls: Array<(callServerEndpoint: ?CallServerEndpoint) => mixed>,
};

export type ServerCallSelectorParams = {
  +dispatch: Dispatch,
  +cookie: ?string,
  +urlPrefix: string,
  +sessionID: ?string,
  +currentUserInfo: ?CurrentUserInfo,
  +isSocketConnected: boolean,
  +lastCommunicatedPlatformDetails: ?PlatformDetails,
};
export type BindServerCallsParams = $ReadOnly<{
  ...ServerCallSelectorParams,
  +keyserverID: string,
}>;

type Props = {
  +children: React.Node,
};
function CallKeyserverEndpointProvider(props: Props): React.Node {
  const ongoingRecoveryAttemptsRef = React.useRef<
    Map<string, OngoingRecoveryAttempt>,
  >(new Map());

  const bindCookieAndUtilsIntoCallServerEndpoint: (
    params: BindServerCallsParams,
  ) => CallServerEndpoint = React.useCallback(params => {
    const {
      dispatch,
      cookie,
      urlPrefix,
      sessionID,
      currentUserInfo,
      isSocketConnected,
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
        keyserverID,
      );
    const canResolveInvalidation = canResolveKeyserverSessionInvalidation();
    // This function gets called before callServerEndpoint sends a request,
    // to make sure that we're not in the middle of trying to recover
    // an invalidated cookie
    const waitIfCookieInvalidated = () => {
      if (!canResolveInvalidation) {
        // If there is no way to resolve the session invalidation,
        // just let the caller callServerEndpoint instance continue
        return Promise.resolve(null);
      }
      const ongoingRecoveryAttempt =
        ongoingRecoveryAttemptsRef.current.get(keyserverID);
      if (!ongoingRecoveryAttempt) {
        // Our cookie seems to be valid
        return Promise.resolve(null);
      }
      // Wait to run until we get our new cookie
      return new Promise<?CallServerEndpoint>(r =>
        ongoingRecoveryAttempt.waitingCalls.push(r),
      );
    };
    // This function is a helper for the next function defined below
    const attemptToResolveInvalidation = async (
      sessionChange: ClientSessionChange,
    ) => {
      const newAnonymousCookie = sessionChange.cookie;
      const newSessionChange = await resolveKeyserverSessionInvalidation(
        dispatch,
        newAnonymousCookie,
        urlPrefix,
        logInActionSources.cookieInvalidationResolutionAttempt,
        keyserverID,
      );

      const ongoingRecoveryAttempt =
        ongoingRecoveryAttemptsRef.current.get(keyserverID);
      ongoingRecoveryAttemptsRef.current.delete(keyserverID);
      const currentWaitingCalls = ongoingRecoveryAttempt?.waitingCalls ?? [];

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
    // If this function is called, callServerEndpoint got a response
    // invalidating its cookie, and is wondering if it should just like...
    // give up? Or if there's a chance at redemption
    const cookieInvalidationRecovery = (sessionChange: ClientSessionChange) => {
      if (!canResolveInvalidation) {
        // If there is no way to resolve the session invalidation,
        // just let the caller callServerEndpoint instance continue
        return Promise.resolve(null);
      }
      if (!loggedIn) {
        // We don't want to attempt any use native credentials of a logged out
        // user to log-in after a cookieInvalidation while logged out
        return Promise.resolve(null);
      }
      const ongoingRecoveryAttempt =
        ongoingRecoveryAttemptsRef.current.get(keyserverID);
      if (ongoingRecoveryAttempt) {
        return new Promise<?CallServerEndpoint>(r =>
          ongoingRecoveryAttempt.waitingCalls.push(r),
        );
      }
      ongoingRecoveryAttemptsRef.current.set(keyserverID, { waitingCalls: [] });
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
        isSocketConnected,
        lastCommunicatedPlatformDetails,
        socketAPIHandler,
        endpoint,
        data,
        dispatch,
        options,
        loggedIn,
        keyserverID,
      );
  }, []);

  // All server calls needs to include some information from the Redux state
  // (namely, the cookie). This information is used deep in the server call,
  // at the point where callServerEndpoint is called. We don't want to bother
  // propagating the cookie (and any future config info that callServerEndpoint
  // needs) through to the server calls so they can pass it to
  // callServerEndpoint. Instead, we "curry" the cookie onto callServerEndpoint
  // within react-redux's connect's mapStateToProps function, and then pass that
  // "bound" callServerEndpoint that no longer needs the cookie as a parameter
  // on to the server call.
  const createBoundServerCallsSelector = React.useCallback(
    (
      keyserverID: string,
    ): (<F>(actionFunc: ActionFunc<F>) => ServerCallSelectorParams => F) =>
      actionFunc =>
        createSelector(
          (state: ServerCallSelectorParams) => state.dispatch,
          (state: ServerCallSelectorParams) => state.cookie,
          (state: ServerCallSelectorParams) => state.urlPrefix,
          (state: ServerCallSelectorParams) => state.sessionID,
          (state: ServerCallSelectorParams) => state.currentUserInfo,
          (state: ServerCallSelectorParams) => state.isSocketConnected,
          (state: ServerCallSelectorParams) =>
            state.lastCommunicatedPlatformDetails,
          (
            dispatch: Dispatch,
            cookie: ?string,
            urlPrefix: string,
            sessionID: ?string,
            currentUserInfo: ?CurrentUserInfo,
            isSocketConnected: boolean,
            lastCommunicatedPlatformDetails: ?PlatformDetails,
          ) => {
            const boundCallServerEndpoint =
              bindCookieAndUtilsIntoCallServerEndpoint({
                dispatch,
                cookie,
                urlPrefix,
                sessionID,
                currentUserInfo,
                isSocketConnected,
                lastCommunicatedPlatformDetails,
                keyserverID,
              });
            return actionFunc(boundCallServerEndpoint);
          },
        ),
    [bindCookieAndUtilsIntoCallServerEndpoint],
  );

  const value = React.useMemo(
    () => ({
      bindCookieAndUtilsIntoCallServerEndpoint,
      createBoundServerCallsSelector,
    }),
    [bindCookieAndUtilsIntoCallServerEndpoint, createBoundServerCallsSelector],
  );

  return (
    <CallKeyserverEndpointContext.Provider value={value}>
      {props.children}
    </CallKeyserverEndpointContext.Provider>
  );
}

function useCallKeyserverEndpointContext(): CallKeyserverEndpointContextType {
  const callKeyserverEndpointContext = React.useContext(
    CallKeyserverEndpointContext,
  );
  invariant(
    callKeyserverEndpointContext,
    'callKeyserverEndpointContext should be set',
  );
  return callKeyserverEndpointContext;
}

let socketAPIHandler: ?SocketAPIHandler = null;
function registerActiveSocket(passedSocketAPIHandler: ?SocketAPIHandler) {
  socketAPIHandler = passedSocketAPIHandler;
}

export {
  CallKeyserverEndpointProvider,
  useCallKeyserverEndpointContext,
  registerActiveSocket,
};
