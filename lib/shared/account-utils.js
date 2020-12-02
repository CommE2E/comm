// @flow

import {
  cookieInvalidationResolutionAttempt,
  socketAuthErrorResolutionAttempt,
} from '../actions/user-actions';
import type { LogInActionSource } from '../types/account-types';
import type { AppState } from '../types/redux-types';
import type { PreRequestUserState } from '../types/session-types';
import type { CurrentUserInfo } from '../types/user-types';

const oldValidUsernameRegexString = '[a-zA-Z0-9-_]+';
const validUsernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_]{5,}$/;
const oldValidUsernameRegex = new RegExp(`^${oldValidUsernameRegexString}$`);
const validEmailRegex = new RegExp(
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+/.source +
    /@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/.source +
    /(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.source,
);

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
      preRequestUserState.cookie !== currentReduxState.cookie ||
      preRequestUserState.sessionID !== currentReduxState.sessionID)
  );
}

function invalidSessionRecovery(
  currentReduxState: AppState,
  actionCurrentUserInfo: CurrentUserInfo,
  source: ?LogInActionSource,
) {
  if (
    source !== cookieInvalidationResolutionAttempt &&
    source !== socketAuthErrorResolutionAttempt
  ) {
    return false;
  }
  return (
    !currentReduxState.dataLoaded ||
    currentReduxState.currentUserInfo?.id !== actionCurrentUserInfo.id
  );
}

export {
  oldValidUsernameRegexString,
  validUsernameRegex,
  oldValidUsernameRegex,
  validEmailRegex,
  invalidSessionDowngrade,
  invalidSessionRecovery,
};
