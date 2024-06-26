// @flow

import t, { type TInterface } from 'tcomb';

import type {
  UserSearchRequest,
  UserSearchResult,
  ExactUserSearchRequest,
  ExactUserSearchResult,
} from 'lib/types/search-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import { searchForUsers, searchForUser } from '../search/users.js';
import type { Viewer } from '../session/viewer.js';

export const userSearchRequestInputValidator: TInterface<UserSearchRequest> =
  tShape<UserSearchRequest>({
    prefix: t.maybe(t.String),
  });

async function userSearchResponder(
  viewer: Viewer,
  request: UserSearchRequest,
): Promise<UserSearchResult> {
  const searchResults = await searchForUsers(request);
  return { userInfos: searchResults };
}

export const exactUserSearchRequestInputValidator: TInterface<ExactUserSearchRequest> =
  tShape<ExactUserSearchRequest>({
    username: t.String,
  });

async function exactUserSearchResponder(
  viewer: Viewer,
  request: ExactUserSearchRequest,
): Promise<ExactUserSearchResult> {
  const searchResult = await searchForUser(request.username);
  return { userInfo: searchResult };
}

export { userSearchResponder, exactUserSearchResponder };
