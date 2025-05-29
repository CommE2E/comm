// @flow

import type {
  CallSingleKeyserverEndpoint,
  CallSingleKeyserverEndpointOptions,
} from './call-single-keyserver-endpoint.js';
import type { AuthActionSource } from '../types/account-types.js';
import type { Endpoint } from '../types/endpoints.js';
import type { Dispatch } from '../types/redux-types.js';
import type {
  ClientSessionChange,
  PreRequestUserState,
} from '../types/session-types.js';
import type { ConnectionStatus } from '../types/socket-types.js';

export type ActionTypes<
  STARTED_ACTION_TYPE: string,
  SUCCESS_ACTION_TYPE: string,
  FAILED_ACTION_TYPE: string,
> = {
  +started: STARTED_ACTION_TYPE,
  +success: SUCCESS_ACTION_TYPE,
  +failed: FAILED_ACTION_TYPE,
};

export const setNewSessionActionType = 'SET_NEW_SESSION';
export function setNewSession(
  dispatch: Dispatch,
  sessionChange: ClientSessionChange,
  preRequestUserState: ?PreRequestUserState,
  error: ?string,
  authActionSource: ?AuthActionSource,
  keyserverID: string,
) {
  dispatch({
    type: setNewSessionActionType,
    payload: {
      sessionChange,
      preRequestUserState,
      error,
      authActionSource,
      keyserverID,
    },
  });
}

export type SingleKeyserverActionFunc<F> = (
  callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
) => F;

export type CallKeyserverEndpoint = (
  endpoint: Endpoint,
  requests: { +[keyserverID: string]: ?{ +[string]: mixed } },
  options?: ?CallSingleKeyserverEndpointOptions,
) => Promise<{ +[keyserverID: string]: any }>;
export type ActionFunc<Args: mixed, Return> = (
  callKeyserverEndpoint: CallKeyserverEndpoint,
  // The second argument is only used in actions that call all keyservers,
  // and the request to all keyservers are exactly the same.
  // An example of such action is fetchEntries.
  allKeyserverIDs: $ReadOnlyArray<string>,
) => Args => Promise<Return>;

export const setConnectionIssueActionType = 'SET_CONNECTION_ISSUE';

export const updateConnectionStatusActionType = 'UPDATE_CONNECTION_STATUS';
export type UpdateConnectionStatusPayload = {
  +status: ConnectionStatus,
  +keyserverID: string,
};

export const setLateResponseActionType = 'SET_LATE_RESPONSE';
export type SetLateResponsePayload = {
  +messageID: number,
  +isLate: boolean,
  +keyserverID: string,
};

export const updateKeyserverReachabilityActionType =
  'UPDATE_KEYSERVER_REACHABILITY';
export type UpdateKeyserverReachabilityPayload = {
  +visible: boolean,
  +keyserverID: string,
};

export const setActiveSessionRecoveryActionType = 'SET_ACTIVE_SESSION_RECOVERY';

// We pass this string to the Error constructor when dispatching a _FAILED
// action via throwing in the promise that we pass to dispatchActionPromise
export const CANCELLED_ERROR = 'cancelled';
