// @flow

import type { BaseAppState } from '../types/redux-types';
import type {
  UserInfos,
  RelativeUserInfo,
  AccountUserInfo,
} from '../types/user-types';
import {
  type RawThreadInfo,
  type RelativeMemberInfo,
} from '../types/thread-types';
import { userRelationshipStatus } from '../types/relationship-types';

import { createSelector } from 'reselect';
import _memoize from 'lodash/memoize';

import SearchIndex from '../shared/search-index';
import { memberHasAdminPowers } from '../shared/thread-utils';

// Used for specific message payloads that include an array of user IDs, ie.
// array of initial users, array of added users
function userIDsToRelativeUserInfos(
  userIDs: string[],
  viewerID: ?string,
  userInfos: UserInfos,
): RelativeUserInfo[] {
  const relativeUserInfos = [];
  for (let userID of userIDs) {
    const username = userInfos[userID] ? userInfos[userID].username : null;
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

const emptyArray = [];

// Includes current user at the start
const baseRelativeMemberInfoSelectorForMembersOfThread = (
  threadID: ?string,
) => {
  if (!threadID) {
    return () => emptyArray;
  }
  return createSelector(
    (state: BaseAppState<*>) => state.threadStore.threadInfos[threadID],
    (state: BaseAppState<*>) =>
      state.currentUserInfo && state.currentUserInfo.id,
    (state: BaseAppState<*>) => state.userStore.userInfos,
    (
      threadInfo: ?RawThreadInfo,
      currentUserID: ?string,
      userInfos: UserInfos,
    ): $ReadOnlyArray<RelativeMemberInfo> => {
      const relativeMemberInfos = [];
      if (!threadInfo) {
        return relativeMemberInfos;
      }
      const memberInfos = threadInfo.members;
      for (const memberInfo of memberInfos) {
        const isParentAdmin = memberHasAdminPowers(memberInfo);
        if (!memberInfo.role && !isParentAdmin) {
          continue;
        }
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
};

const relativeMemberInfoSelectorForMembersOfThread: (
  threadID: ?string,
) => (state: BaseAppState<*>) => $ReadOnlyArray<RelativeMemberInfo> = _memoize(
  baseRelativeMemberInfoSelectorForMembersOfThread,
);

const userInfoSelectorForPotentialMembers: (
  state: BaseAppState<*>,
) => { [id: string]: AccountUserInfo } = createSelector(
  (state: BaseAppState<*>) => state.userStore.userInfos,
  (state: BaseAppState<*>) => state.currentUserInfo && state.currentUserInfo.id,
  (
    userInfos: UserInfos,
    currentUserID: ?string,
  ): { [id: string]: AccountUserInfo } => {
    const availableUsers: { [id: string]: AccountUserInfo } = {};

    for (const id in userInfos) {
      const { username, relationshipStatus } = userInfos[id];
      if (id === currentUserID || !username) {
        continue;
      }
      if (
        relationshipStatus !== userRelationshipStatus.BLOCKED_VIEWER &&
        relationshipStatus !== userRelationshipStatus.BOTH_BLOCKED
      ) {
        availableUsers[id] = { id, username, relationshipStatus };
      }
    }
    return availableUsers;
  },
);

function searchIndexFromUserInfos(userInfos: {
  [id: string]: AccountUserInfo,
}) {
  const searchIndex = new SearchIndex();
  for (const id in userInfos) {
    searchIndex.addEntry(id, userInfos[id].username);
  }
  return searchIndex;
}

const userSearchIndexForPotentialMembers: (
  state: BaseAppState<*>,
) => SearchIndex = createSelector(
  userInfoSelectorForPotentialMembers,
  searchIndexFromUserInfos,
);

const isLoggedIn = (state: BaseAppState<*>) =>
  !!(
    state.currentUserInfo &&
    !state.currentUserInfo.anonymous &&
    state.dataLoaded
  );

const userStoreSearchIndex: (
  state: BaseAppState<*>,
) => SearchIndex = createSelector(
  (state: BaseAppState<*>) => state.userStore.userInfos,
  (userInfos: UserInfos) => {
    const searchIndex = new SearchIndex();
    for (const id in userInfos) {
      const { username } = userInfos[id];
      if (!username) {
        continue;
      }
      searchIndex.addEntry(id, username);
    }
    return searchIndex;
  },
);

export {
  userIDsToRelativeUserInfos,
  relativeMemberInfoSelectorForMembersOfThread,
  userInfoSelectorForPotentialMembers,
  searchIndexFromUserInfos,
  userSearchIndexForPotentialMembers,
  isLoggedIn,
  userStoreSearchIndex,
};
