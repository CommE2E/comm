// @flow

import t from 'tcomb';

import type {
  UserSearchRequest,
  UserSearchResult,
} from 'lib/types/search-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import { searchForUsers } from '../search/users.js';
import type { Viewer } from '../session/viewer.js';
import { validateInput } from '../utils/validation-utils.js';

const userSearchRequestInputValidator = tShape({
  prefix: t.maybe(t.String),
});

async function userSearchResponder(
  viewer: Viewer,
  input: any,
): Promise<UserSearchResult> {
  const request: UserSearchRequest = input;
  await validateInput(viewer, userSearchRequestInputValidator, request);
  const searchResults = await searchForUsers(request);
  return { userInfos: searchResults };
}

export { userSearchResponder };
