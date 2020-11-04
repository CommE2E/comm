// @flow

import type { AccountUserInfo } from '../types/user-types';
import type { ThreadInfo } from '../types/thread-types';

import SearchIndex from './search-index';
import { userIsMember } from './thread-utils';

type Result = {|
  id: string,
  username: string,
  memberOfParentThread: boolean,
|};
function getUserSearchResults(
  text: string,
  userInfos: { [id: string]: AccountUserInfo },
  searchIndex: SearchIndex,
  excludeUserIDs: $ReadOnlyArray<string>,
  parentThreadInfo: ?ThreadInfo,
): Result[] {
  const results = [];
  const appendUserInfo = (userInfo: AccountUserInfo) => {
    if (!excludeUserIDs.includes(userInfo.id)) {
      results.push(userInfo);
    }
  };
  if (text === '') {
    for (let id in userInfos) {
      appendUserInfo(userInfos[id]);
    }
  } else {
    const ids = searchIndex.getSearchResults(text);
    for (let id of ids) {
      appendUserInfo(userInfos[id]);
    }
  }
  const resultsWithMembershipInfo = results.map((userInfo) => ({
    id: userInfo.id,
    username: userInfo.username,
    memberOfParentThread:
      !parentThreadInfo || userIsMember(parentThreadInfo, userInfo.id),
  }));
  if (text === '') {
    return resultsWithMembershipInfo.filter(
      (userInfo) => userInfo.memberOfParentThread,
    );
  }
  return resultsWithMembershipInfo;
}

export { getUserSearchResults };
