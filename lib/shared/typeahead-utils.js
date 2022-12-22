// @flow

import type { RelativeMemberInfo } from '../types/thread-types';
import SearchIndex from './search-index';
import { stringForUserExplicit } from './user-utils';

function getTypeaheadUserSuggestions(
  userSearchIndex: SearchIndex,
  usersInThread: $ReadOnlyArray<RelativeMemberInfo>,
  typedPrefix: string,
): $ReadOnlyArray<RelativeMemberInfo> {
  const userIDs = userSearchIndex.getSearchResults(typedPrefix);

  return usersInThread
    .filter(user => typedPrefix.length === 0 || userIDs.includes(user.id))
    .sort((userA, userB) =>
      stringForUserExplicit(userA).localeCompare(stringForUserExplicit(userB)),
    );
}

export { getTypeaheadUserSuggestions };
