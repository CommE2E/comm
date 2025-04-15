// @flow

import invariant from 'invariant';
import * as React from 'react';

import callSingleKeyServerEndpoint from './call-single-keyserver-endpoint.js';
import type {
  CallSingleKeyserverEndpoint,
  CallSingleKeyserverEndpointOptions,
} from './call-single-keyserver-endpoint.js';
import {
  setNewSession,
  type CallKeyserverEndpoint,
} from './keyserver-conn-types.js';
import { logOutActionTypes, useLogOut } from '../actions/user-actions.js';
import {
  cookieSelector,
  sessionIDSelector,
  urlPrefixSelector,
} from '../selectors/keyserver-selectors.js';
import type { RecoveryActionSource } from '../types/account-types.js';
import type { Endpoint } from '../types/endpoints.js';
import type { Dispatch } from '../types/redux-types.js';
import {
  type ClientSessionChange,
  genericCookieInvalidation,
  type PreRequestUserState,
} from '../types/session-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { promiseAll } from '../utils/promises.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';
import { relyingOnAuthoritativeKeyserver } from '../utils/services-utils.js';

// This function attempts to resolve an invalid keyserver session. A session can
// become invalid when a keyserver invalidates it, or due to inconsistent client
// state. If the client is usingCommServicesAccessToken, then the invalidation
// recovery will try to go through the keyserver's Olm auth responder.
// Otherwise, it will attempt to use the user's credentials to log in with the
// legacy auth responder, which won't work on web and won't work for ETH users.
async function resolveKeyserverSessionInvalidation(
  dispatch: Dispatch,
  cookie: ?string,
  urlPrefix: string,
  recoveryActionSource: RecoveryActionSource,
  keyserverID: string,
  userStateBeforeRecovery: PreRequestUserState,
  actionFunc: (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ) => Promise<mixed>,
): Promise<?ClientSessionChange> {
  let newSessionChange = null;
  const boundCallSingleKeyserverEndpoint = async (
    endpoint: Endpoint,
    data: { +[key: string]: mixed },
    options?: ?CallSingleKeyserverEndpointOptions,
  ) => {
    const innerBoundSetNewSession = (
      sessionChange: ClientSessionChange,
      error: ?string,
    ) => {
      newSessionChange = sessionChange;
      setNewSession(
        dispatch,
        sessionChange,
        userStateBeforeRecovery,
        error,
        recoveryActionSource,
        keyserverID,
      );
    };
    return await callSingleKeyServerEndpoint(
      cookie,
      innerBoundSetNewSession,
      () => new Promise(r => r(null)),
      () => new Promise(r => r(null)),
      urlPrefix,
      null,
      false,
      null,
      null,
      endpoint,
      data,
      dispatch,
      options,
      false,
      keyserverID,
    );
  };

  const boundCallKeyserverEndpoint = (
    endpoint: Endpoint,
    requests: { +[keyserverID: string]: ?{ +[string]: mixed } },
    options?: ?CallSingleKeyserverEndpointOptions,
  ) => {
    if (requests[keyserverID]) {
      const promises = {
        [keyserverID]: boundCallSingleKeyserverEndpoint(
          endpoint,
          requests[keyserverID],
          options,
        ),
      };
      return promiseAll(promises);
    }
    return Promise.resolve({});
  };

  await actionFunc(
    boundCallSingleKeyserverEndpoint,
    boundCallKeyserverEndpoint,
  );
  return newSessionChange;
}

function useKeyserverRecoveryLogIn(
  keyserverID: string,
): (
  source: RecoveryActionSource,
  actionFunc: (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ) => Promise<mixed>,
  hasBeenCancelled: () => boolean,
) => Promise<void> {
  const preRequestUserInfo = useSelector(state => state.currentUserInfo);
  const cookie = useSelector(cookieSelector(keyserverID));
  const sessionID = useSelector(sessionIDSelector(keyserverID));
  const preRequestUserState = React.useMemo(
    () => ({
      currentUserInfo: preRequestUserInfo,
      cookiesAndSessions: {
        [keyserverID]: {
          cookie,
          sessionID,
        },
      },
    }),
    [preRequestUserInfo, keyserverID, cookie, sessionID],
  );

  // We only need to do a "spot check" on this value below.
  // - To avoid regenerating below callbacks whenever it changes, we want to
  //   make sure it's not in those callbacks' dep lists.
  // - If we exclude it from those callbacks' dep lists, we'll end up binding in
  //   the value of preRequestUserState at the time the callbacks are updated.
  //   Instead, by assigning to a ref, we are able to use the latest value.
  const preRequestUserStateRef = React.useRef(preRequestUserState);
  preRequestUserStateRef.current = preRequestUserState;

  const dispatch = useDispatch();
  const urlPrefix = useSelector(urlPrefixSelector(keyserverID));

  const logOut = useLogOut();
  const dispatchActionPromise = useDispatchActionPromise();

  const invalidateKeyserverSession = React.useCallback(
    (
      source: RecoveryActionSource,
      sessionChange: ClientSessionChange,
      hasBeenCancelled: () => boolean,
    ) => {
      if (hasBeenCancelled()) {
        return;
      }
      setNewSession(
        dispatch,
        sessionChange,
        preRequestUserStateRef.current,
        null,
        source,
        keyserverID,
      );
      if (
        keyserverID === authoritativeKeyserverID() &&
        relyingOnAuthoritativeKeyserver
      ) {
        void dispatchActionPromise(logOutActionTypes, logOut());
      }
    },
    [dispatch, keyserverID, dispatchActionPromise, logOut],
  );

  return React.useCallback(
    async (
      source: RecoveryActionSource,
      actionFunc: (
        callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
        callKeyserverEndpoint: CallKeyserverEndpoint,
      ) => Promise<mixed>,
      hasBeenCancelled: () => boolean,
    ) => {
      invariant(
        urlPrefix,
        `urlPrefix for ${keyserverID} should be set during recovery login`,
      );

      const userStateBeforeRecovery = preRequestUserStateRef.current;
      try {
        const recoverySessionChange = await resolveKeyserverSessionInvalidation(
          dispatch,
          cookie,
          urlPrefix,
          source,
          keyserverID,
          userStateBeforeRecovery,
          actionFunc,
        );
        const sessionChange =
          recoverySessionChange ?? genericCookieInvalidation;
        if (
          sessionChange.cookieInvalidated ||
          !sessionChange.cookie ||
          !sessionChange.cookie.startsWith('user=')
        ) {
          invalidateKeyserverSession(source, sessionChange, hasBeenCancelled);
        }
      } catch (e) {
        if (hasBeenCancelled()) {
          return;
        }
        console.log(
          `Error during recovery login with keyserver ${keyserverID}`,
          e,
        );
        invalidateKeyserverSession(
          source,
          genericCookieInvalidation,
          hasBeenCancelled,
        );
        throw e;
      }
    },
    [keyserverID, dispatch, cookie, urlPrefix, invalidateKeyserverSession],
  );
}

export { resolveKeyserverSessionInvalidation, useKeyserverRecoveryLogIn };
