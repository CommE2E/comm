// @flow

import type {
  UserSearchRequest,
  UserSearchResult,
} from 'lib/types/search-types';
import type { Viewer } from '../session/viewer';

import t from 'tcomb';

import { validateInput, tShape } from '../utils/validation-utils';
import { searchForUsers } from '../search/users';

const userSearchRequestInputValidator = tShape({
  prefix: t.maybe(t.String),
});

async function userSearchResponder(
  viewer: Viewer,
  input: any,
): Promise<UserSearchResult> {
  const request: UserSearchRequest = input;
  validateInput(userSearchRequestInputValidator, request);
  const searchResults = await searchForUsers(request);
  return { userInfos: searchResults };
}

export {
  userSearchResponder,
};
