// @flow

import invariant from 'invariant';

import {
  cookieSelector,
  sessionIDSelector,
} from '../selectors/keyserver-selectors.js';
import {
  logInActionSources,
  type LogInActionSource,
} from '../types/account-types.js';
import type { AppState } from '../types/redux-types.js';
import type {
  PreRequestUserState,
  IdentityCallPreRequestUserState,
} from '../types/session-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { usingCommServicesAccessToken } from '../utils/services-utils.js';

function invalidSessionDowngrade(
  currentReduxState: AppState,
  actionCurrentUserInfo: ?CurrentUserInfo,
  preRequestUserState: ?(PreRequestUserState | IdentityCallPreRequestUserState),
  keyserverID: string,
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
      preRequestUserState.cookiesAndSessions[keyserverID].cookie !==
        cookieSelector(keyserverID)(currentReduxState) ||
      preRequestUserState.cookiesAndSessions[keyserverID].sessionID !==
        sessionIDSelector(keyserverID)(currentReduxState))
  );
}

function identityInvalidSessionDowngrade(
  currentReduxState: AppState,
  actionCurrentUserInfo: ?CurrentUserInfo,
  preRequestUserState: ?IdentityCallPreRequestUserState,
): boolean {
  if (!usingCommServicesAccessToken) {
    return invalidSessionDowngrade(
      currentReduxState,
      actionCurrentUserInfo,
      preRequestUserState,
      authoritativeKeyserverID,
    );
  }
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
      preRequestUserState.commServicesAccessToken !==
        currentReduxState.commServicesAccessToken)
  );
}

function invalidSessionRecovery(
  currentReduxState: AppState,
  actionCurrentUserInfo: ?CurrentUserInfo,
  logInActionSource: ?LogInActionSource,
): boolean {
  if (
    logInActionSource !==
      logInActionSources.cookieInvalidationResolutionAttempt &&
    logInActionSource !== logInActionSources.socketAuthErrorResolutionAttempt
  ) {
    return false;
  }
  invariant(
    actionCurrentUserInfo,
    'currentUserInfo (preRequestUserInfo) should be defined when ' +
      'COOKIE_INVALIDATION_RESOLUTION_ATTEMPT or ' +
      'SOCKET_AUTH_ERROR_RESOLUTION_ATTEMPT login is dispatched',
  );
  return (
    !currentReduxState.dataLoaded ||
    currentReduxState.currentUserInfo?.id !== actionCurrentUserInfo.id
  );
}

export {
  invalidSessionDowngrade,
  identityInvalidSessionDowngrade,
  invalidSessionRecovery,
};
