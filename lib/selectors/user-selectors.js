// @flow

import type { BaseAppState } from '../types/redux-types';
import type { UserInfo } from '../types/user-types';

import { createSelector } from 'reselect';

import SearchIndex from '../shared/search-index';

// other than the logged-in user
const otherUserInfos = createSelector(
  (state: BaseAppState) => state.userInfos,
  (state: BaseAppState) => state.currentUserInfo && state.currentUserInfo.id,
  (
    userInfos: {[id: string]: UserInfo},
    userID: ?string,
  ): {[id: string]: UserInfo} => {
    const others = {};
    for (let id in userInfos) {
      if (id !== userID) {
        others[id] = userInfos[id];
      }
    }
    return others;
  },
);

const userSearchIndex = createSelector(
  otherUserInfos,
  (userInfos: {[id: string]: UserInfo}) => {
    const searchIndex = new SearchIndex();
    for (const id in userInfos) {
      searchIndex.addEntry(id, userInfos[id].username);
    }
    return searchIndex;
  },
);

export {
  otherUserInfos,
  userSearchIndex,
};
