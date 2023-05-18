// @flow

import t, { type TInterface } from 'tcomb';

import type {
  UserSearchRequest,
  UserSearchResult,
  ExactUserSearchRequest,
  ExactUserSearchResult,
} from 'lib/types/search-types.js';
import { globalAccountUserInfoValidator } from 'lib/types/user-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import { searchForUsers, searchForUser } from '../search/users.js';
import type { Viewer } from '../session/viewer.js';
import { validateInput, validateOutput } from '../utils/validation-utils.js';

const userSearchRequestInputValidator = tShape<UserSearchRequest>({
  prefix: t.maybe(t.String),
});

export const userSearchResultValidator: TInterface<UserSearchResult> =
  tShape<UserSearchResult>({
    userInfos: t.list(globalAccountUserInfoValidator),
  });

async function userSearchResponder(
  viewer: Viewer,
  input: mixed,
): Promise<UserSearchResult> {
  const request = await validateInput(
    viewer,
    userSearchRequestInputValidator,
    input,
  );
  const searchResults = await searchForUsers(request);
  const result = { userInfos: searchResults };
  return validateOutput(
    viewer.platformDetails,
    userSearchResultValidator,
    result,
  );
}

const exactUserSearchRequestInputValidator = tShape<ExactUserSearchRequest>({
  username: t.String,
});

const exactUserSearchResultValidator = tShape<ExactUserSearchResult>({
  userInfo: t.maybe(globalAccountUserInfoValidator),
});

async function exactUserSearchResponder(
  viewer: Viewer,
  input: mixed,
): Promise<ExactUserSearchResult> {
  const request = await validateInput(
    viewer,
    exactUserSearchRequestInputValidator,
    input,
  );
  const searchResult = await searchForUser(request.username);
  const result = { userInfo: searchResult };
  return validateOutput(
    viewer.platformDetails,
    exactUserSearchResultValidator,
    result,
  );
}

export { userSearchResponder, exactUserSearchResponder };
