// @flow

import invariant from 'invariant';
import _memoize from 'lodash/memoize.js';
import * as React from 'react';
import { createSelector } from 'reselect';

import type {
  CallSingleKeyserverEndpoint,
  CallSingleKeyserverEndpointOptions,
} from './call-single-keyserver-endpoint.js';
import callSingleKeyserverEndpoint from './call-single-keyserver-endpoint.js';
import {
  useKeyserverCallInfos,
  type KeyserverCallInfo,
} from './keyserver-call-infos.js';
import {
  setNewSession,
  type SingleKeyserverActionFunc,
  type ActionFunc,
  setActiveSessionRecoveryActionType,
  type CallKeyserverEndpoint,
} from './keyserver-conn-types.js';
import {
  recoveryFromReduxActionSources,
  type RecoveryFromReduxActionSource,
} from '../types/account-types.js';
import type { PlatformDetails } from '../types/device-types.js';
import type { Endpoint, SocketAPIHandler } from '../types/endpoints.js';
import type { Dispatch } from '../types/redux-types.js';
import type { ClientSessionChange } from '../types/session-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';
import { promiseAll } from '../utils/promises.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';

type CreateCallSingleKeyserverEndpointSelector = (
  keyserverID: string,
) => ServerCallSelectorParams => CallSingleKeyserverEndpoint;

type GetBoundSingleKeyserverActionFunc = <F>(
  keyserverID: string,
  actionFunc: SingleKeyserverActionFunc<F>,
) => F;

type SingleKeyserverActionFuncSelectorParams = {
  +callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
};
type CreateBoundSingleKeyserverActionFuncSelector = <F>(
  actionFunc: SingleKeyserverActionFunc<F>,
) => SingleKeyserverActionFuncSelectorParams => F;

type GetBoundKeyserverActionFunc = <Args, Return>(
  actionFunc: ActionFunc<Args, Return>,
) => Args => Promise<Return>;

type CallKeyserverEndpointContextType = {
  +createCallSingleKeyserverEndpointSelector: CreateCallSingleKeyserverEndpointSelector,
  +getBoundSingleKeyserverActionFunc: GetBoundSingleKeyserverActionFunc,
  +callKeyserverEndpoint: CallKeyserverEndpoint,
  +getBoundKeyserverActionFunc: GetBoundKeyserverActionFunc,
  +registerActiveSocket: (
    keyserverID: string,
    socketAPIHandler: ?SocketAPIHandler,
  ) => mixed,
};

const CallKeyserverEndpointContext: React.Context<?CallKeyserverEndpointContextType> =
  React.createContext();

type OngoingRecoveryAttempt = {
  +waitingCalls: Array<
    (callSingleKeyserverEndpoint: ?CallSingleKeyserverEndpoint) => mixed,
  >,
};

export type ServerCallSelectorParams = {
  +dispatch: Dispatch,
  +cookie: ?string,
  +urlPrefix: string,
  +sessionID: ?string,
  +currentUserInfo: ?CurrentUserInfo,
  +isSocketConnected: boolean,
  +activeSessionRecovery: ?RecoveryFromReduxActionSource,
  +canRecoverSession?: ?boolean,
  +lastCommunicatedPlatformDetails: ?PlatformDetails,
};
type BindServerCallsParams = $ReadOnly<{
  ...ServerCallSelectorParams,
  +keyserverID: string,
}>;

type Props = {
  +children: React.Node,
};
function CallKeyserverEndpointProvider(props: Props): React.Node {
  // SECTION 1: bindCookieAndUtilsIntoCallServerEndpoint

  const ongoingRecoveryAttemptsRef = React.useRef<
    Map<string, OngoingRecoveryAttempt>,
  >(new Map());

  const socketAPIHandlers = React.useRef<Map<string, ?SocketAPIHandler>>(
    new Map(),
  );

  const registerActiveSocket = React.useCallback(
    (keyserverID: string, socketAPIHandler: ?SocketAPIHandler) =>
      socketAPIHandlers.current.set(keyserverID, socketAPIHandler),
    [],
  );

  const bindCookieAndUtilsIntoCallSingleKeyserverEndpoint: (
    params: BindServerCallsParams,
  ) => CallSingleKeyserverEndpoint = React.useCallback(params => {
    const {
      dispatch,
      cookie,
      urlPrefix,
      sessionID,
      currentUserInfo,
      isSocketConnected,
      activeSessionRecovery,
      canRecoverSession,
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
    // This function gets called before callSingleKeyserverEndpoint sends a
    // request, to make sure that we're not in the middle of trying to recover
    // an invalidated cookie
    const waitIfCookieInvalidated = () => {
      if (!canRecoverSession) {
        // If there is no way to resolve the session invalidation,
        // just let the caller callSingleKeyserverEndpoint instance continue
        return Promise.resolve(null);
      }
      if (!activeSessionRecovery) {
        // Our cookie seems to be valid
        return Promise.resolve(null);
      }
      const recoveryAttempts = ongoingRecoveryAttemptsRef.current;
      let keyserverRecoveryAttempts = recoveryAttempts.get(keyserverID);
      if (!keyserverRecoveryAttempts) {
        keyserverRecoveryAttempts = { waitingCalls: [] };
        recoveryAttempts.set(keyserverID, keyserverRecoveryAttempts);
      }
      const ongoingRecoveryAttempts = keyserverRecoveryAttempts;
      // Wait to run until we get our new cookie
      return new Promise<?CallSingleKeyserverEndpoint>(r =>
        ongoingRecoveryAttempts.waitingCalls.push(r),
      );
    };
    // If this function is called, callSingleKeyserverEndpoint got a response
    // invalidating its cookie, and is wondering if it should just like...
    // give up? Or if there's a chance at redemption
    const cookieInvalidationRecovery = (
      sessionChange: ClientSessionChange,
      error: ?string,
    ) => {
      if (!canRecoverSession) {
        // When invalidation recovery is supported, we let that code call
        // setNewSession. When it isn't supported, we call it directly here.
        // Once usingCommServicesAccessToken is true, we should consider
        // removing this call... see description of D10952 for details.
        boundSetNewSession(sessionChange, error);
        // If there is no way to resolve the session invalidation,
        // just let the caller callSingleKeyserverEndpoint instance continue
        return Promise.resolve(null);
      }
      if (!loggedIn) {
        // We don't want to attempt any use native credentials of a logged out
        // user to log-in after a cookieInvalidation while logged out
        return Promise.resolve(null);
      }

      const recoveryAttempts = ongoingRecoveryAttemptsRef.current;
      let keyserverRecoveryAttempts = recoveryAttempts.get(keyserverID);
      if (!keyserverRecoveryAttempts) {
        keyserverRecoveryAttempts = { waitingCalls: [] };
        recoveryAttempts.set(keyserverID, keyserverRecoveryAttempts);
      }
      if (!activeSessionRecovery) {
        dispatch({
          type: setActiveSessionRecoveryActionType,
          payload: {
            activeSessionRecovery:
              recoveryFromReduxActionSources.cookieInvalidationResolutionAttempt,
            keyserverID,
          },
        });
      }
      const ongoingRecoveryAttempts = keyserverRecoveryAttempts;
      return new Promise<?CallSingleKeyserverEndpoint>(r =>
        ongoingRecoveryAttempts.waitingCalls.push(r),
      );
    };

    return (
      endpoint: Endpoint,
      data: Object,
      options?: ?CallSingleKeyserverEndpointOptions,
    ) =>
      callSingleKeyserverEndpoint(
        cookie,
        boundSetNewSession,
        waitIfCookieInvalidated,
        cookieInvalidationRecovery,
        urlPrefix,
        sessionID,
        isSocketConnected,
        lastCommunicatedPlatformDetails,
        socketAPIHandlers.current.get(keyserverID),
        endpoint,
        data,
        dispatch,
        options,
        loggedIn,
        keyserverID,
      );
  }, []);

  // SECTION 2: createCallSingleKeyserverEndpointSelector

  // For each keyserver, we have a set of params that configure our connection
  // to it. These params get bound into callSingleKeyserverEndpoint before it's
  // passed to a SingleKeyserverActionFunc. This helper function lets us create
  // a selector for a given keyserverID that will regenerate the bound
  // callSingleKeyserverEndpoint function only if one of the params changes.
  // This lets us skip some React render cycles.
  const createCallSingleKeyserverEndpointSelector = React.useCallback(
    (
      keyserverID: string,
    ): (ServerCallSelectorParams => CallSingleKeyserverEndpoint) =>
      createSelector(
        (params: ServerCallSelectorParams) => params.dispatch,
        (params: ServerCallSelectorParams) => params.cookie,
        (params: ServerCallSelectorParams) => params.urlPrefix,
        (params: ServerCallSelectorParams) => params.sessionID,
        (params: ServerCallSelectorParams) => params.currentUserInfo,
        (params: ServerCallSelectorParams) => params.isSocketConnected,
        (params: ServerCallSelectorParams) => params.activeSessionRecovery,
        (params: ServerCallSelectorParams) => params.canRecoverSession,
        (params: ServerCallSelectorParams) =>
          params.lastCommunicatedPlatformDetails,
        (
          dispatch: Dispatch,
          cookie: ?string,
          urlPrefix: string,
          sessionID: ?string,
          currentUserInfo: ?CurrentUserInfo,
          isSocketConnected: boolean,
          activeSessionRecovery: ?RecoveryFromReduxActionSource,
          canRecoverSession: ?boolean,
          lastCommunicatedPlatformDetails: ?PlatformDetails,
        ) =>
          bindCookieAndUtilsIntoCallSingleKeyserverEndpoint({
            dispatch,
            cookie,
            urlPrefix,
            sessionID,
            currentUserInfo,
            isSocketConnected,
            activeSessionRecovery,
            canRecoverSession,
            lastCommunicatedPlatformDetails,
            keyserverID,
          }),
      ),
    [bindCookieAndUtilsIntoCallSingleKeyserverEndpoint],
  );

  // SECTION 3: getCallSingleKeyserverEndpoint

  const dispatch = useDispatch();
  const currentUserInfo = useSelector(state => state.currentUserInfo);

  const keyserverInfos = useSelector(
    state => state.keyserverStore.keyserverInfos,
  );
  const keyserverCallInfos = useKeyserverCallInfos(keyserverInfos);

  const callSingleKeyserverEndpointSelectorCacheRef = React.useRef<
    Map<string, (ServerCallSelectorParams) => CallSingleKeyserverEndpoint>,
  >(new Map());
  const getCallSingleKeyserverEndpoint = React.useCallback(
    (keyserverID: string) => {
      let selector =
        callSingleKeyserverEndpointSelectorCacheRef.current.get(keyserverID);
      if (!selector) {
        selector = createCallSingleKeyserverEndpointSelector(keyserverID);
        callSingleKeyserverEndpointSelectorCacheRef.current.set(
          keyserverID,
          selector,
        );
      }
      const keyserverCallInfo = keyserverCallInfos[keyserverID];
      return selector({
        ...keyserverCallInfo,
        dispatch,
        currentUserInfo,
        canRecoverSession: true,
      });
    },
    [
      createCallSingleKeyserverEndpointSelector,
      dispatch,
      currentUserInfo,
      keyserverCallInfos,
    ],
  );

  // SECTION 4: flush waitingCalls when activeSessionRecovery flips to falsy

  const prevKeyserverCallInfosRef = React.useRef<{
    +[keyserverID: string]: KeyserverCallInfo,
  }>(keyserverCallInfos);
  React.useEffect(() => {
    const sessionRecoveriesConcluded = new Set<string>();
    const prevKeyserverCallInfos = prevKeyserverCallInfosRef.current;
    for (const keyserverID in keyserverCallInfos) {
      const prevKeyserverCallInfo = prevKeyserverCallInfos[keyserverID];
      if (!prevKeyserverCallInfo) {
        continue;
      }
      const keyserverCallInfo = keyserverCallInfos[keyserverID];
      if (
        !keyserverCallInfo.activeSessionRecovery &&
        prevKeyserverCallInfo.activeSessionRecovery
      ) {
        sessionRecoveriesConcluded.add(keyserverID);
      }
    }

    for (const keyserverID of sessionRecoveriesConcluded) {
      const recoveryAttempts = ongoingRecoveryAttemptsRef.current;
      const keyserverRecoveryAttempts = recoveryAttempts.get(keyserverID);
      if (!keyserverRecoveryAttempts) {
        continue;
      }
      const { waitingCalls } = keyserverRecoveryAttempts;
      if (waitingCalls.length === 0) {
        continue;
      }

      const { cookie } = keyserverCallInfos[keyserverID];
      const hasUserCookie = cookie && cookie.startsWith('user=');

      const boundCallSingleKeyserverEndpoint = hasUserCookie
        ? getCallSingleKeyserverEndpoint(keyserverID)
        : null;
      for (const waitingCall of waitingCalls) {
        waitingCall(boundCallSingleKeyserverEndpoint);
      }
    }

    prevKeyserverCallInfosRef.current = keyserverCallInfos;
  }, [keyserverCallInfos, getCallSingleKeyserverEndpoint]);

  // SECTION 5: getBoundSingleKeyserverActionFunc

  const createBoundSingleKeyserverActionFuncSelector: CreateBoundSingleKeyserverActionFuncSelector =
    React.useCallback(
      actionFunc =>
        createSelector(
          (params: SingleKeyserverActionFuncSelectorParams) =>
            params.callSingleKeyserverEndpoint,
          actionFunc,
        ),
      [],
    );

  const createBoundSingleKeyserverActionFuncsCache: () => CreateBoundSingleKeyserverActionFuncSelector =
    React.useCallback(
      () => _memoize(createBoundSingleKeyserverActionFuncSelector),
      [createBoundSingleKeyserverActionFuncSelector],
    );

  const boundSingleKeyserverActionFuncSelectorCacheRef = React.useRef<
    Map<string, CreateBoundSingleKeyserverActionFuncSelector>,
  >(new Map());
  const getBoundSingleKeyserverActionFunc: GetBoundSingleKeyserverActionFunc =
    React.useCallback(
      <F>(keyserverID: string, actionFunc: SingleKeyserverActionFunc<F>): F => {
        let selector =
          boundSingleKeyserverActionFuncSelectorCacheRef.current.get(
            keyserverID,
          );
        if (!selector) {
          selector = createBoundSingleKeyserverActionFuncsCache();
          boundSingleKeyserverActionFuncSelectorCacheRef.current.set(
            keyserverID,
            selector,
          );
        }
        const callEndpoint = getCallSingleKeyserverEndpoint(keyserverID);
        return selector(actionFunc)({
          callSingleKeyserverEndpoint: callEndpoint,
        });
      },
      [
        createBoundSingleKeyserverActionFuncsCache,
        getCallSingleKeyserverEndpoint,
      ],
    );

  // SECTION 6: getBoundKeyserverActionFunc

  const callKeyserverEndpoint = React.useCallback(
    (
      endpoint: Endpoint,
      requests: { +[keyserverID: string]: ?{ +[string]: mixed } },
      options?: ?CallSingleKeyserverEndpointOptions,
    ) => {
      const makeCallToSingleKeyserver = (keyserverID: string) => {
        const boundCallSingleKeyserverEndpoint =
          getCallSingleKeyserverEndpoint(keyserverID);
        return boundCallSingleKeyserverEndpoint(
          endpoint,
          requests[keyserverID],
          options,
        );
      };
      const promises: { [string]: Promise<Object> } = {};
      for (const keyserverID in requests) {
        promises[keyserverID] = makeCallToSingleKeyserver(keyserverID);
      }
      return promiseAll(promises);
    },
    [getCallSingleKeyserverEndpoint],
  );

  const keyserverIDs = React.useMemo(
    () => Object.keys(keyserverCallInfos),
    [keyserverCallInfos],
  );

  const getBoundKeyserverActionFunc: GetBoundKeyserverActionFunc =
    React.useMemo(
      () =>
        _memoize(actionFunc => actionFunc(callKeyserverEndpoint, keyserverIDs)),
      [callKeyserverEndpoint, keyserverIDs],
    );

  const value = React.useMemo(
    () => ({
      createCallSingleKeyserverEndpointSelector,
      getBoundSingleKeyserverActionFunc,
      callKeyserverEndpoint,
      getBoundKeyserverActionFunc,
      registerActiveSocket,
    }),
    [
      createCallSingleKeyserverEndpointSelector,
      getBoundSingleKeyserverActionFunc,
      callKeyserverEndpoint,
      getBoundKeyserverActionFunc,
      registerActiveSocket,
    ],
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

export { CallKeyserverEndpointProvider, useCallKeyserverEndpointContext };
