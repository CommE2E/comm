// @flow

import invariant from 'invariant';
import _memoize from 'lodash/memoize.js';
import * as React from 'react';
import { createSelector } from 'reselect';

import { useKeyserverCallInfos } from './keyserver-call-infos.js';
import {
  setNewSession,
  type SingleKeyserverActionFunc,
  type ActionFunc,
} from './keyserver-conn-types.js';
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
  CallSingleKeyserverEndpoint,
  CallSingleKeyserverEndpointOptions,
} from '../utils/call-single-keyserver-endpoint.js';
import callSingleKeyserverEndpoint from '../utils/call-single-keyserver-endpoint.js';
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
  +getBoundKeyserverActionFunc: GetBoundKeyserverActionFunc,
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
  +sessionRecoveryInProgress: boolean,
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
    const canResolveInvalidation =
      canRecoverSession && canResolveKeyserverSessionInvalidation();
    // This function gets called before callSingleKeyserverEndpoint sends a
    // request, to make sure that we're not in the middle of trying to recover
    // an invalidated cookie
    const waitIfCookieInvalidated = () => {
      if (!canResolveInvalidation) {
        // If there is no way to resolve the session invalidation,
        // just let the caller callSingleKeyserverEndpoint instance continue
        return Promise.resolve(null);
      }
      const ongoingRecoveryAttempt =
        ongoingRecoveryAttemptsRef.current.get(keyserverID);
      if (!ongoingRecoveryAttempt) {
        // Our cookie seems to be valid
        return Promise.resolve(null);
      }
      // Wait to run until we get our new cookie
      return new Promise<?CallSingleKeyserverEndpoint>(r =>
        ongoingRecoveryAttempt.waitingCalls.push(r),
      );
    };
    // These functions are helpers for cookieInvalidationRecovery, defined below
    const attemptToResolveInvalidationHelper = async (
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

      return newSessionChange
        ? bindCookieAndUtilsIntoCallSingleKeyserverEndpoint({
            ...params,
            cookie: newSessionChange.cookie,
            sessionID: newSessionChange.sessionID,
            currentUserInfo: newSessionChange.currentUserInfo,
          })
        : null;
    };
    const attemptToResolveInvalidation = (
      sessionChange: ClientSessionChange,
    ) => {
      return new Promise<?CallSingleKeyserverEndpoint>(
        // eslint-disable-next-line no-async-promise-executor
        async (resolve, reject) => {
          try {
            const newCallSingleKeyserverEndpoint =
              await attemptToResolveInvalidationHelper(sessionChange);
            const ongoingRecoveryAttempt =
              ongoingRecoveryAttemptsRef.current.get(keyserverID);
            ongoingRecoveryAttemptsRef.current.delete(keyserverID);
            const currentWaitingCalls =
              ongoingRecoveryAttempt?.waitingCalls ?? [];

            resolve(newCallSingleKeyserverEndpoint);

            for (const func of currentWaitingCalls) {
              func(newCallSingleKeyserverEndpoint);
            }
          } catch (e) {
            reject(e);
          }
        },
      );
    };
    // If this function is called, callSingleKeyserverEndpoint got a response
    // invalidating its cookie, and is wondering if it should just like...
    // give up? Or if there's a chance at redemption
    const cookieInvalidationRecovery = (
      sessionChange: ClientSessionChange,
      error: ?string,
    ) => {
      if (!canResolveInvalidation) {
        // When invalidation recovery is supported, we let that code call
        // setNewSession. When it isn't supported, we call it directly here.
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
      const ongoingRecoveryAttempt =
        ongoingRecoveryAttemptsRef.current.get(keyserverID);
      if (ongoingRecoveryAttempt) {
        return new Promise<?CallSingleKeyserverEndpoint>(r =>
          ongoingRecoveryAttempt.waitingCalls.push(r),
        );
      }
      ongoingRecoveryAttemptsRef.current.set(keyserverID, { waitingCalls: [] });
      return attemptToResolveInvalidation(sessionChange);
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
        socketAPIHandler,
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
        (params: ServerCallSelectorParams) => params.sessionRecoveryInProgress,
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
          sessionRecoveryInProgress: boolean,
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
            sessionRecoveryInProgress,
            canRecoverSession,
            lastCommunicatedPlatformDetails,
            keyserverID,
          }),
      ),
    [bindCookieAndUtilsIntoCallSingleKeyserverEndpoint],
  );

  // SECTION 3: getBoundSingleKeyserverActionFunc

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

  // SECTION 4: getBoundKeyserverActionFunc

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
      getBoundKeyserverActionFunc,
    }),
    [
      createCallSingleKeyserverEndpointSelector,
      getBoundSingleKeyserverActionFunc,
      getBoundKeyserverActionFunc,
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

let socketAPIHandler: ?SocketAPIHandler = null;
function registerActiveSocket(passedSocketAPIHandler: ?SocketAPIHandler) {
  socketAPIHandler = passedSocketAPIHandler;
}

export {
  CallKeyserverEndpointProvider,
  useCallKeyserverEndpointContext,
  registerActiveSocket,
};
