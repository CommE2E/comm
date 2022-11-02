// @flow

import {
  loginActionSources,
  type LogInActionSource,
} from '../types/account-types';
import type { AppState } from '../types/redux-types';
import type { PreRequestUserState } from '../types/session-types';
import type { CurrentUserInfo } from '../types/user-types';

const usernameMaxLength = 191;
const usernameMinLength = 1;
const secondCharRange = `{${usernameMinLength - 1},${usernameMaxLength - 1}}`;
const validUsernameRegexString = `^[a-zA-Z0-9][a-zA-Z0-9-_]${secondCharRange}$`;
const validUsernameRegex: RegExp = new RegExp(validUsernameRegexString);

// usernames used to be less restrictive (eg single chars were allowed)
// use oldValidUsername when dealing with existing accounts
const oldValidUsernameRegexString = '[a-zA-Z0-9-_]+';
const oldValidUsernameRegex: RegExp = new RegExp(
  `^${oldValidUsernameRegexString}$`,
);

const validEmailRegex: RegExp = new RegExp(
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+/.source +
    /@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/.source +
    /(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.source,
);

const validHexColorRegex: RegExp = /^[a-fA-F0-9]{6}$/;

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
  logInActionSource: ?LogInActionSource,
): boolean {
  if (
    logInActionSource !==
      loginActionSources.cookieInvalidationResolutionAttempt &&
    logInActionSource !== loginActionSources.socketAuthErrorResolutionAttempt
  ) {
    return false;
  }
  return (
    !currentReduxState.dataLoaded ||
    currentReduxState.currentUserInfo?.id !== actionCurrentUserInfo.id
  );
}

export {
  usernameMaxLength,
  oldValidUsernameRegexString,
  validUsernameRegex,
  oldValidUsernameRegex,
  validEmailRegex,
  invalidSessionDowngrade,
  invalidSessionRecovery,
  validHexColorRegex,
};
