// @flow

import type { AccountUserInfo } from '../types/user-types';
import SearchIndex from './search-index';

function getUserSearchResults(
  text: string,
  userInfos: {[id: string]: AccountUserInfo},
  searchIndex: SearchIndex,
  excludeUserIDs: $ReadOnlyArray<string>,
) {
  const results = [];
  const appendUserInfo = (userInfo: AccountUserInfo) => {
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
