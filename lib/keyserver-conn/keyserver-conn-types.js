// @flow

import type {
  LogInActionSource,
  LogInStartingPayload,
  LogInResult,
} from '../types/account-types.js';
import type { Dispatch } from '../types/redux-types.js';
import type {
  ClientSessionChange,
  PreRequestUserState,
} from '../types/session-types.js';

export type ActionTypes<
  STARTED_ACTION_TYPE: string,
  SUCCESS_ACTION_TYPE: string,
  FAILED_ACTION_TYPE: string,
> = {
  started: STARTED_ACTION_TYPE,
  success: SUCCESS_ACTION_TYPE,
  failed: FAILED_ACTION_TYPE,
};

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
  keyserverID: string,
) {
  dispatch({
    type: setNewSessionActionType,
    payload: {
      sessionChange,
      preRequestUserState,
      error,
      logInActionSource,
      keyserverID,
    },
  });
}

export { setNewSessionActionType, setNewSession };
