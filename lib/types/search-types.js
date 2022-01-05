// @flow
import t, { type TInterface } from 'tcomb';

import { tShape } from '../utils/validation-utils';
import {
  type GlobalAccountUserInfo,
  globalAccountUserInfoValidator,
} from './user-types';

export type UserSearchRequest = {
  prefix?: string,
};
export type UserSearchResult = {
  userInfos: $ReadOnlyArray<GlobalAccountUserInfo>,
};
export const UserSearchResultValidator: TInterface = tShape({
  userInfos: t.list(globalAccountUserInfoValidator),
});
