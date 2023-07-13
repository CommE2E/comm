// @flow

import { cookieSelector } from '../selectors/keyserver-selectors.js';
import {
  logInActionSources,
  type LogInActionSource,
} from '../types/account-types.js';
import type { AppState } from '../types/redux-types.js';
import type { PreRequestUserState } from '../types/session-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';

function invalidSessionDowngrade(
  currentReduxState: AppState,
  actionCurrentUserInfo: ?CurrentUserInfo,
  preRequestUserState: ?PreRequestUserState,
): boolean {
  // If this action represents a session downgrade - oldState has a loggedIn
  // currentUserInfo, but the action has an anonymous one - then it is only
  // valid if the currentUserInfo used for the request matches what oldState
  // currently has. If the currentUserInfo in Redux has changed since the
  // request, and is currently loggedIn, then the session downgrade does not
  // apply to it. In this case we will simply swallow the action.
  const currentCurrentUserInfo = currentReduxState.currentUserInfo;
  return !!(
    currentCurrentUserInfo &&
    !currentCurrentUserInfo.anonymous &&
    // Note that an undefined actionCurrentUserInfo represents an action that
    // doesn't affect currentUserInfo, whereas a null one represents an action
    // that sets it to null
    (actionCurrentUserInfo === null ||
      (actionCurrentUserInfo && actionCurrentUserInfo.anonymous)) &&
    preRequestUserState &&
    (preRequestUserState.currentUserInfo?.id !== currentCurrentUserInfo.id ||
      preRequestUserState.cookie !== cookieSelector(currentReduxState) ||
      preRequestUserState.sessionID !== currentReduxState.sessionID)
  );
}

function invalidSessionRecovery(
  currentReduxState: AppState,
  actionCurrentUserInfo: CurrentUserInfo,
  logInActionSource: ?LogInActionSource,
): boolean {
  if (
    logInActionSource !==
      logInActionSources.cookieInvalidationResolutionAttempt &&
    logInActionSource !== logInActionSources.socketAuthErrorResolutionAttempt
  ) {
    return false;
  }
  return (
    !currentReduxState.dataLoaded ||
    currentReduxState.currentUserInfo?.id !== actionCurrentUserInfo.id
  );
}

export { invalidSessionDowngrade, invalidSessionRecovery };
