// @flow

import type { RelativeMemberInfo } from '../types/thread-types';
import SearchIndex from './search-index';
import { threadOtherMembers } from './thread-utils';
import { stringForUserExplicit } from './user-utils';

function getTypeaheadUserSuggestions(
  userSearchIndex: SearchIndex,
  threadMembers: $ReadOnlyArray<RelativeMemberInfo>,
  viewerID: ?string,
  typedPrefix: string,
): $ReadOnlyArray<RelativeMemberInfo> {
  const userIDs = userSearchIndex.getSearchResults(typedPrefix);
  const usersInThread = threadOtherMembers(threadMembers, viewerID);

  return usersInThread
    .filter(user => typedPrefix.length === 0 || userIDs.includes(user.id))
    .sort((userA, userB) =>
      stringForUserExplicit(userA).localeCompare(stringForUserExplicit(userB)),
    );
}

export { getTypeaheadUserSuggestions };
