// @flow

import type { $Response, $Request } from 'express';
import type { UserSearchQuery } from 'lib/types/search-types';

import t from 'tcomb';

import { tShape } from '../utils/tcomb-utils';
import { setCurrentViewerFromCookie } from '../session/cookies';
import { searchForUsers } from '../search/users';

const userSearchQueryInputValidator = tShape({
  prefix: t.maybe(t.String),
});

async function userSearchResponder(req: $Request, res: $Response) {
  const userSearchQuery: UserSearchQuery = (req.body: any);
  if (!userSearchQueryInputValidator.is(userSearchQuery)) {
    return { error: 'invalid_parameters' };
  }

  await setCurrentViewerFromCookie(req.cookies);
  const searchResults = await searchForUsers(userSearchQuery);

  return { success: true, userInfos: searchResults };
}

export {
  userSearchResponder,
};
