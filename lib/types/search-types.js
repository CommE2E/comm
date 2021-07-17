// @flow

import type { GlobalAccountUserInfo } from './user-types';

export type UserSearchRequest = {
  prefix?: string,
};
export type UserSearchResult = {
  userInfos: $ReadOnlyArray<GlobalAccountUserInfo>,
};
