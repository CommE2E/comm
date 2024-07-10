// @flow

import {
  isLoggedIn,
  isLoggedInToKeyserver,
} from '../selectors/user-selectors.js';
import type { LoggedInUserInfo } from '../types/user-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { useSelector } from '../utils/redux-utils.js';

function useLoggedInUserInfo(): ?LoggedInUserInfo {
  return useSelector(state =>
    state.currentUserInfo && !state.currentUserInfo.anonymous
      ? state.currentUserInfo
      : null,
  );
}

function useIsLoggedInToAuthoritativeKeyserver(): boolean {
  return useSelector(isLoggedInToKeyserver(authoritativeKeyserverID()));
}

function useIsLoggedInToIdentityAndAuthoritativeKeyserver(): boolean {
  return useSelector(
    state =>
      isLoggedInToKeyserver(authoritativeKeyserverID())(state) &&
      isLoggedIn(state),
  );
}

export {
  useLoggedInUserInfo,
  useIsLoggedInToAuthoritativeKeyserver,
  useIsLoggedInToIdentityAndAuthoritativeKeyserver,
};
