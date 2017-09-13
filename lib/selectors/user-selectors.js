// @flow

import type { BaseAppState } from '../types/redux-types';
import type { UserInfo } from '../types/user-types';

import { createSelector } from 'reselect';
import _memoize from 'lodash/memoize';
import _keys from 'lodash/keys';

import SearchIndex from '../shared/search-index';

// If threadID is null, then all users except the logged-in user are returned
const baseUserInfoSelectorForOtherMembersOfThread = (threadID: ?string) =>
  createSelector(
    (state: BaseAppState) => state.userInfos,
    (state: BaseAppState) => state.currentUserInfo && state.currentUserInfo.id,
    (state: BaseAppState) => threadID && state.threadInfos[threadID]
      ? state.threadInfos[threadID].memberIDs
      : null,
    (
      userInfos: {[id: string]: UserInfo},
      currentUserID: ?string,
      memberUserIDs: ?string[],
    ): {[id: string]: UserInfo} => {
      const others = {};
      if (!memberUserIDs) {
        memberUserIDs = _keys(userInfos);
      }
      for (let memberID of memberUserIDs) {
        if (memberID !== currentUserID && userInfos[memberID]) {
          others[memberID] = userInfos[memberID];
        }
      }
      return others;
    },
  );

const userInfoSelectorForOtherMembersOfThread = _memoize(
  baseUserInfoSelectorForOtherMembersOfThread,
);

function searchIndexFromUserInfos(userInfos: {[id: string]: UserInfo}) {
  const searchIndex = new SearchIndex();
  for (const id in userInfos) {
    searchIndex.addEntry(id, userInfos[id].username);
  }
  return searchIndex;
}

const baseUserSearchIndexForOtherMembersOfThread = (threadID: ?string) =>
  createSelector(
    userInfoSelectorForOtherMembersOfThread(threadID),
    searchIndexFromUserInfos,
  );

const userSearchIndexForOtherMembersOfThread = _memoize(
  baseUserSearchIndexForOtherMembersOfThread,
);

export {
  userInfoSelectorForOtherMembersOfThread,
  userSearchIndexForOtherMembersOfThread,
};
