// @flow

import t, { type TInterface } from 'tcomb';

import { tShape } from '../../utils/validation-utils.js';
import type {
  ExactUserSearchResult,
  UserSearchResult,
} from '../search-types.js';
import { globalAccountUserInfoValidator } from '../user-types.js';

export const exactUserSearchResultValidator: TInterface<ExactUserSearchResult> =
  tShape<ExactUserSearchResult>({
    userInfo: t.maybe(globalAccountUserInfoValidator),
  });

export const userSearchResultValidator: TInterface<UserSearchResult> =
  tShape<UserSearchResult>({
    userInfos: t.list(globalAccountUserInfoValidator),
  });
