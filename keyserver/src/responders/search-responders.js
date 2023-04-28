// @flow

import t, { type TInterface } from 'tcomb';

import type {
  UserSearchRequest,
  UserSearchResult,
} from 'lib/types/search-types.js';
import { globalAccountUserInfoValidator } from 'lib/types/user-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import { searchForUsers } from '../search/users.js';
import type { Viewer } from '../session/viewer.js';
import { validateInput, validateOutput } from '../utils/validation-utils.js';

const userSearchRequestInputValidator = tShape({
  prefix: t.maybe(t.String),
});

export const userSearchResultValidator: TInterface<UserSearchResult> =
  tShape<UserSearchResult>({
    userInfos: t.list(globalAccountUserInfoValidator),
  });

async function userSearchResponder(
  viewer: Viewer,
  input: any,
): Promise<UserSearchResult> {
  const request: UserSearchRequest = input;
  await validateInput(viewer, userSearchRequestInputValidator, request);
  const searchResults = await searchForUsers(request);
  const result = { userInfos: searchResults };
  return validateOutput(viewer, userSearchResultValidator, result);
}

export { userSearchResponder };
