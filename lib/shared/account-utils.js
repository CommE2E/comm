// @flow

import type { CurrentUserInfo } from '../types/user-types';

const validUsernameRegex = /^[a-zA-Z0-9-_]+$/;
const validEmailRegex = new RegExp(
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+/.source +
  /@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/.source +
  /(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.source
);

function invalidSessionDowngrade(
  currentCurrentUserInfo: ?CurrentUserInfo,
  actionCurrentUserInfo: ?CurrentUserInfo,
  requestCurrentUserInfo: ?CurrentUserInfo,
): bool {
  // If this action represents a session downgrade - oldState has a loggedIn
  // currentUserInfo, but the action has an anonymous one - then it is only
  // valid if the currentUserInfo used for the request matches what oldState
  // currently has. If the currentUserInfo in Redux has changed since the
  // request, and is currently loggedIn, then the session downgrade does not
  // apply to it. In this case we will simply swallow the action.
  return !!(
    currentCurrentUserInfo &&
    !currentCurrentUserInfo.anonymous &&
    actionCurrentUserInfo &&
    actionCurrentUserInfo.anonymous &&
    (!requestCurrentUserInfo ||
      requestCurrentUserInfo.id !== currentCurrentUserInfo.id)
  );
}

export { validUsernameRegex, validEmailRegex, invalidSessionDowngrade };
