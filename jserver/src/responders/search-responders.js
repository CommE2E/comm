// @flow

import type { $Response, $Request } from 'express';
import type { UserSearchQuery } from 'lib/types/search-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { tShape } from '../utils/tcomb-utils';
import { searchForUsers } from '../search/users';

const userSearchQueryInputValidator = tShape({
  prefix: t.maybe(t.String),
});

async function userSearchResponder(req: $Request, res: $Response) {
  const userSearchQuery: UserSearchQuery = (req.body: any);
  if (!userSearchQueryInputValidator.is(userSearchQuery)) {
    throw new ServerError('invalid_parameters');
  }

  const searchResults = await searchForUsers(userSearchQuery);

  return { userInfos: searchResults };
}

export {
  userSearchResponder,
};
