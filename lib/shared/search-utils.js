// @flow

import type { UserInfo } from '../types/user-types';
import SearchIndex from './search-index';

function getUserSearchResults(
  text: string,
  userInfos: {[id: string]: UserInfo},
  searchIndex: SearchIndex,
  excludeUserIDs: $ReadOnlyArray<string>,
) {
  const results = [];
  const appendUserInfo = (userInfo: UserInfo) => {
    if (!excludeUserIDs.includes(userInfo.id)) {
      results.push(userInfo);
    }
  };
  if (text === "") {
    for (let id in userInfos) {
      appendUserInfo(userInfos[id]);
    }
  } else {
    const ids = searchIndex.getSearchResults(text);
    for (let id of ids) {
      appendUserInfo(userInfos[id]);
    }
  }
  return results;
}

export {
  getUserSearchResults,
};
