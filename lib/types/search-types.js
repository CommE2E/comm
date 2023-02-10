// @flow

import type { GlobalAccountUserInfo } from './user-types.js';

export type UserSearchRequest = {
  prefix?: string,
};
export type UserSearchResult = {
  userInfos: $ReadOnlyArray<GlobalAccountUserInfo>,
};
