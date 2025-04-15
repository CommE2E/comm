// @flow

import invariant from 'invariant';

import {
  cookieSelector,
  sessionIDSelector,
} from '../selectors/keyserver-selectors.js';
import {
  recoveryFromReduxActionSources,
  type AuthActionSource,
} from '../types/account-types.js';
import type { AppState } from '../types/redux-types.js';
import type {
  PreRequestUserState,
  IdentityCallPreRequestUserState,
} from '../types/session-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';

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

// actionCurrentUserInfo can either be the CurrentUserInfo at the time the
// recovery began (preRequestUserInfo), or the CurrentUserInfo in the action.
// We expect that for a recovery they should be the same. The intention is to
// make sure that the CurrentUserInfo in Redux at the time this action is
// processed is the same as the user from whom the recovery was attempted. If
// that user has since logged out, we should ignore the result of the recovery.
const actionSourcesCheckedForInvalidSessionRecovery = new Set(
  Object.values(recoveryFromReduxActionSources),
);
function invalidSessionRecovery(
  currentReduxState: AppState,
  actionCurrentUserInfo: ?CurrentUserInfo,
  authActionSource: ?AuthActionSource,
): boolean {
  if (
    !authActionSource ||
    !actionSourcesCheckedForInvalidSessionRecovery.has(authActionSource)
  ) {
    return false;
  }
  invariant(
    actionCurrentUserInfo,
    'actionCurrentUserInfo should be passed to invalidSessionRecovery for ' +
      `${authActionSource} login`,
  );
  if (actionCurrentUserInfo.anonymous) {
    // It's not a session recovery if the CurrentUserInfo is anonymous
    return false;
  }
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
