// @flow

import t from 'tcomb';

import type {
  UserSearchRequest,
  UserSearchResult,
} from 'lib/types/search-types';
import { tShape } from 'lib/utils/validation-utils';

import { searchForUsers } from '../search/users';
import type { Viewer } from '../session/viewer';
import { validateInput } from '../utils/validation-utils';

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
