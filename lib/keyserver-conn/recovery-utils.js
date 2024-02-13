// @flow

import { type ActionTypes, setNewSession } from './keyserver-conn-types.js';
import type { InitialNotifMessageOptions } from '../shared/crypto-utils.js';
import type {
  RecoveryActionSource,
  LogInStartingPayload,
  LogInResult,
} from '../types/account-types.js';
import type { Endpoint } from '../types/endpoints.js';
import type { Dispatch } from '../types/redux-types.js';
import type { ClientSessionChange } from '../types/session-types.js';
import callSingleKeyServerEndpoint from '../utils/call-single-keyserver-endpoint.js';
import type { CallSingleKeyserverEndpointOptions } from '../utils/call-single-keyserver-endpoint.js';
import { getConfig } from '../utils/config.js';
import { promiseAll } from '../utils/promises.js';
import { wrapActionPromise } from '../utils/redux-promise-utils.js';
import { usingCommServicesAccessToken } from '../utils/services-utils.js';

// This function is a shortcut that tells us whether it's worth even trying to
// call resolveKeyserverSessionInvalidation
function canResolveKeyserverSessionInvalidation(): boolean {
  if (usingCommServicesAccessToken) {
    // We can always try to resolve a keyserver session invalidation
    // automatically using the Olm auth responder
    return true;
  }
  const { resolveKeyserverSessionInvalidationUsingNativeCredentials } =
    getConfig();
  // If we can't use the Olm auth responder, then we can only resolve a
  // keyserver session invalidation on native, where we have access to the
  // user's native credentials. Note that we can't do this for ETH users, but we
  // don't know if the user is an ETH user from this function
  return !!resolveKeyserverSessionInvalidationUsingNativeCredentials;
}

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
  getInitialNotificationsEncryptedMessage?: (
    keyserverID: string,
    options?: ?InitialNotifMessageOptions,
  ) => Promise<string>,
): Promise<?ClientSessionChange> {
  const { resolveKeyserverSessionInvalidationUsingNativeCredentials } =
    getConfig();
  if (!resolveKeyserverSessionInvalidationUsingNativeCredentials) {
    return null;
  }
  let newSessionChange = null;
  let callSingleKeyserverEndpointCallback = null;
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
        null,
        error,
        recoveryActionSource,
        keyserverID,
      );
    };
    try {
      const result = await callSingleKeyServerEndpoint(
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
      if (callSingleKeyserverEndpointCallback) {
        callSingleKeyserverEndpointCallback(!!newSessionChange);
      }
      return result;
    } catch (e) {
      if (callSingleKeyserverEndpointCallback) {
        callSingleKeyserverEndpointCallback(!!newSessionChange);
      }
      throw e;
    }
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

  const dispatchRecoveryAttempt = (
    actionTypes: ActionTypes<
      'LOG_IN_STARTED',
      'LOG_IN_SUCCESS',
      'LOG_IN_FAILED',
    >,
    promise: Promise<LogInResult>,
    inputStartingPayload: LogInStartingPayload,
  ) => {
    const startingPayload = {
      ...inputStartingPayload,
      authActionSource: recoveryActionSource,
    };
    void dispatch(
      wrapActionPromise(actionTypes, promise, null, startingPayload),
    );
    return new Promise<boolean>(r => (callSingleKeyserverEndpointCallback = r));
  };
  await resolveKeyserverSessionInvalidationUsingNativeCredentials(
    boundCallSingleKeyserverEndpoint,
    boundCallKeyserverEndpoint,
    dispatchRecoveryAttempt,
    recoveryActionSource,
    keyserverID,
    getInitialNotificationsEncryptedMessage,
  );
  return newSessionChange;
}

export {
  canResolveKeyserverSessionInvalidation,
  resolveKeyserverSessionInvalidation,
};
