// @flow

import type { RelativeMemberInfo } from '../types/thread-types';
import SearchIndex from './search-index';
import { threadOtherMembers } from './thread-utils';
import { stringForUserExplicit } from './user-utils';

export type TypeaheadMatchedStrings = {
  +textBeforeAtSymbol: string,
  +usernamePrefix: string,
};

function getTypeaheadUserSuggestions(
  userSearchIndex: SearchIndex,
  threadMembers: $ReadOnlyArray<RelativeMemberInfo>,
  viewerID: ?string,
  usernamePrefix: string,
): $ReadOnlyArray<RelativeMemberInfo> {
  const userIDs = userSearchIndex.getSearchResults(usernamePrefix);
  const usersInThread = threadOtherMembers(threadMembers, viewerID);

  return usersInThread
    .filter(user => usernamePrefix.length === 0 || userIDs.includes(user.id))
    .sort((userA, userB) =>
      stringForUserExplicit(userA).localeCompare(stringForUserExplicit(userB)),
    );
}

export { getTypeaheadUserSuggestions };
