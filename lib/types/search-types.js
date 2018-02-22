// @flow

import type { AccountUserInfo } from './user-types';

export type UserSearchRequest = {|
  prefix?: string,
|};
export type UserSearchResult = {|
  userInfos: $ReadOnlyArray<AccountUserInfo>,
|};
