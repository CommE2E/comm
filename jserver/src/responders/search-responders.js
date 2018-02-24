// @flow

import type {
  UserSearchRequest,
  UserSearchResult,
} from 'lib/types/search-types';
import type { Viewer } from '../session/viewer';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { tShape } from '../utils/tcomb-utils';
import { searchForUsers } from '../search/users';

const userSearchRequestInputValidator = tShape({
  prefix: t.maybe(t.String),
});

async function userSearchResponder(
  viewer: Viewer,
  body: any,
): Promise<UserSearchResult> {
  const userSearchRequest: UserSearchRequest = body;
  if (!userSearchRequestInputValidator.is(userSearchRequest)) {
    throw new ServerError('invalid_parameters');
  }

  const searchResults = await searchForUsers(userSearchRequest);

  return { userInfos: searchResults };
}

export {
  userSearchResponder,
};
