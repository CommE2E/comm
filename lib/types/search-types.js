// @flow

import type { GlobalAccountUserInfo } from './user-types.js';

export type UserSearchRequest = {
  +prefix?: string,
};
export type UserSearchResult = {
  +userInfos: $ReadOnlyArray<GlobalAccountUserInfo>,
};

export type ExactUserSearchRequest = {
  +username: string,
};
export type ExactUserSearchResult = {
  +userInfo: ?GlobalAccountUserInfo,
};
