// @flow

import type { BaseAppState } from '../types/redux-types';
import type {
  UserInfo,
  RelativeUserInfo,
  AccountUserInfo,
} from '../types/user-types';
import type {
  RawThreadInfo,
  MemberInfo,
  RelativeMemberInfo,
} from '../types/thread-types';

import { createSelector } from 'reselect';
import _memoize from 'lodash/memoize';
import _keys from 'lodash/keys';

import SearchIndex from '../shared/search-index';
import { threadActualMembers } from '../shared/thread-utils';

// Used for specific message payloads that include an array of user IDs, ie.
// array of initial users, array of added users
function userIDsToRelativeUserInfos(
  userIDs: string[],
  viewerID: ?string,
  userInfos: {[id: string]: UserInfo},
): RelativeUserInfo[] {
  const relativeUserInfos = [];
  for (let userID of userIDs) {
    const username = userInfos[userID]
      ? userInfos[userID].username
      : null;
    if (userID === viewerID) {
      relativeUserInfos.unshift({
        id: userID,
        username,
        isViewer: true,
      });
    } else {
      relativeUserInfos.push({
        id: userID,
        username,
        isViewer: false,
      });
    }
  }
  return relativeUserInfos;
}

// Includes current user at the start
const baseRelativeMemberInfoSelectorForMembersOfThread: (
  threadID: string,
) => (
  state: BaseAppState<*>,
) => RelativeMemberInfo[] = (threadID: string) => createSelector(
  (state: BaseAppState<*>) => state.threadStore.threadInfos[threadID],
  (state: BaseAppState<*>) => state.currentUserInfo && state.currentUserInfo.id,
  (state: BaseAppState<*>) => state.userInfos,
  (
    threadInfo: ?RawThreadInfo,
    currentUserID: ?string,
    userInfos: {[id: string]: UserInfo},
  ): RelativeMemberInfo[] => {
    const relativeMemberInfos = [];
    if (!threadInfo) {
      return relativeMemberInfos;
    }
    const memberInfos = threadInfo.members;
    for (let memberInfo of memberInfos) {
      const username = userInfos[memberInfo.id]
        ? userInfos[memberInfo.id].username
        : null;
      if (memberInfo.id === currentUserID) {
        relativeMemberInfos.unshift({
          id: memberInfo.id,
          role: memberInfo.role,
          permissions: memberInfo.permissions,
          username,
          isViewer: true,
        });
      } else {
        relativeMemberInfos.push({
          id: memberInfo.id,
          role: memberInfo.role,
          permissions: memberInfo.permissions,
          username,
          isViewer: false,
        });
      }
    }
    return relativeMemberInfos;
  },
);

const relativeMemberInfoSelectorForMembersOfThread = _memoize<*, *>(
  baseRelativeMemberInfoSelectorForMembersOfThread,
);

// If threadID is null, then all users except the logged-in user are returned
const baseUserInfoSelectorForOtherMembersOfThread: (
  threadID: ?string,
) => (
  state: BaseAppState<*>,
) => {[id: string]: AccountUserInfo} = (threadID: ?string) => createSelector(
  (state: BaseAppState<*>) => state.userInfos,
  (state: BaseAppState<*>) => state.currentUserInfo &&
    state.currentUserInfo.id,
  (state: BaseAppState<*>) =>
    threadID && state.threadStore.threadInfos[threadID]
      ? state.threadStore.threadInfos[threadID].members
      : null,
  (
    userInfos: {[id: string]: UserInfo},
    currentUserID: ?string,
    members: ?$ReadOnlyArray<MemberInfo>,
  ): {[id: string]: AccountUserInfo} => {
    const others = {};
    const memberUserIDs = members
      ? threadActualMembers(members)
      : _keys(userInfos);
    for (let memberID of memberUserIDs) {
      if (
        memberID !== currentUserID &&
        userInfos[memberID] &&
        userInfos[memberID].username
      ) {
        others[memberID] = userInfos[memberID];
      }
    }
    return others;
  },
);

const userInfoSelectorForOtherMembersOfThread = _memoize<*, *>(
  baseUserInfoSelectorForOtherMembersOfThread,
);

function searchIndexFromUserInfos(userInfos: {[id: string]: AccountUserInfo}) {
  const searchIndex = new SearchIndex();
  for (const id in userInfos) {
    searchIndex.addEntry(id, userInfos[id].username);
  }
  return searchIndex;
}

const baseUserSearchIndexForOtherMembersOfThread: (
  threadID: ?string,
) => (
  state: BaseAppState<*>,
) => SearchIndex = (threadID: ?string) => createSelector(
  userInfoSelectorForOtherMembersOfThread(threadID),
  searchIndexFromUserInfos,
);

const userSearchIndexForOtherMembersOfThread = _memoize<*, *>(
  baseUserSearchIndexForOtherMembersOfThread,
);

export {
  userIDsToRelativeUserInfos,
  relativeMemberInfoSelectorForMembersOfThread,
  userInfoSelectorForOtherMembersOfThread,
  userSearchIndexForOtherMembersOfThread,
};
