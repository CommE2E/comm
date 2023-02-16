// @flow

import type { LoggedInUserInfo } from '../types/user-types.js';
import { useSelector } from '../utils/redux-utils.js';

function useLoggedInUserInfo(): ?LoggedInUserInfo {
  return useSelector(state =>
    state.currentUserInfo && !state.currentUserInfo.anonymous
      ? state.currentUserInfo
      : null,
  );
}

export { useLoggedInUserInfo };
