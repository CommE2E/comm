// @flow

import type { AppState } from '../types/redux-types';
import type { CurrentUserInfo } from '../types/user-types';
import type { PreRequestUserState } from '../types/session-types';

const validUsernameRegex = /^[a-zA-Z0-9-_]+$/;
const validEmailRegex = new RegExp(
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+/.source +
  /@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/.source +
  /(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.source
);

function invalidSessionDowngrade(
  currentReduxState: AppState,
  actionCurrentUserInfo: ?CurrentUserInfo,
  preRequestUserState: ?PreRequestUserState,
): bool {
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
    actionCurrentUserInfo &&
    actionCurrentUserInfo.anonymous &&
    preRequestUserState &&
    (!preRequestUserState.currentUserInfo ||
      preRequestUserState.currentUserInfo.id !== currentCurrentUserInfo.id ||
      preRequestUserState.cookie !== currentReduxState.cookie ||
      preRequestUserState.sessionID !== currentReduxState.sessionID)
  );
}

export { validUsernameRegex, validEmailRegex, invalidSessionDowngrade };
