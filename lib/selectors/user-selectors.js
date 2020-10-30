// @flow

import type { BaseAppState } from '../types/redux-types';
import type {
  UserInfo,
  RelativeUserInfo,
  AccountUserInfo,
} from '../types/user-types';
import {
  type RawThreadInfo,
  type MemberInfo,
  type RelativeMemberInfo,
  threadPermissions,
} from '../types/thread-types';
import { userRelationshipStatus } from '../types/relationship-types';

import { createSelector } from 'reselect';
import _memoize from 'lodash/memoize';

import SearchIndex from '../shared/search-index';
import { threadActualMembers } from '../shared/thread-utils';

// Used for specific message payloads that include an array of user IDs, ie.
// array of initial users, array of added users
function userIDsToRelativeUserInfos(
  userIDs: string[],
  viewerID: ?string,
  userInfos: { [id: string]: UserInfo },
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
      userInfos: { [id: string]: UserInfo },
    ): $ReadOnlyArray<RelativeMemberInfo> => {
      const relativeMemberInfos = [];
      if (!threadInfo) {
        return relativeMemberInfos;
      }
      const memberInfos = threadInfo.members;
      for (let memberInfo of memberInfos) {
        const username = userInfos[memberInfo.id]
          ? userInfos[memberInfo.id].username
          : null;
        const canChangeRoles =
          memberInfo.permissions[threadPermissions.CHANGE_ROLE] &&
          memberInfo.permissions[threadPermissions.CHANGE_ROLE].value;
        if (
          memberInfo.id === currentUserID &&
          (memberInfo.role || canChangeRoles)
        ) {
          relativeMemberInfos.unshift({
            id: memberInfo.id,
            role: memberInfo.role,
            permissions: memberInfo.permissions,
            username,
            isViewer: true,
          });
        } else if (memberInfo.id !== currentUserID) {
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

// We're returning users that might be a thread members:
// friends and not blocked users in parent thread if it exists
const baseUserInfoSelectorForPotentialMembers = (parentThreadID: ?string) =>
  createSelector(
    (state: BaseAppState<*>) => state.userStore.userInfos,
    (state: BaseAppState<*>) =>
      state.currentUserInfo && state.currentUserInfo.id,
    (state: BaseAppState<*>) =>
      parentThreadID && state.threadStore.threadInfos[parentThreadID]
        ? state.threadStore.threadInfos[parentThreadID].members
        : null,
    (
      userInfos: { [id: string]: UserInfo },
      currentUserID: ?string,
      parentThreadMembers: ?$ReadOnlyArray<MemberInfo>,
    ): { [id: string]: AccountUserInfo } => {
      const availableUsers = {};

      const parentThreadMembersIDs = parentThreadMembers
        ? threadActualMembers(parentThreadMembers)
        : [];

      for (const id in userInfos) {
        const userInfo = userInfos[id];
        const { relationshipStatus } = userInfo;
        if (relationshipStatus === userRelationshipStatus.FRIEND) {
          availableUsers[id] = userInfo;
        } else if (
          parentThreadMembersIDs.includes(id) &&
          id !== currentUserID &&
          relationshipStatus !== userRelationshipStatus.BLOCKED_BY_VIEWER &&
          relationshipStatus !== userRelationshipStatus.BLOCKED_VIEWER &&
          relationshipStatus !== userRelationshipStatus.BOTH_BLOCKED
        ) {
          availableUsers[id] = userInfo;
        }
      }
      return availableUsers;
    },
  );

const userInfoSelectorForPotentialMembers: (
  threadID: ?string,
) => (state: BaseAppState<*>) => { [id: string]: AccountUserInfo } = _memoize(
  baseUserInfoSelectorForPotentialMembers,
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

const baseUserSearchIndexForPotentialMembers = (threadID: ?string) =>
  createSelector(
    userInfoSelectorForPotentialMembers(threadID),
    searchIndexFromUserInfos,
  );

const userSearchIndexForPotentialMembers: (
  threadID: ?string,
) => (state: BaseAppState<*>) => SearchIndex = _memoize(
  baseUserSearchIndexForPotentialMembers,
);

const isLoggedIn = (state: BaseAppState<*>) =>
  !!(
    state.currentUserInfo &&
    !state.currentUserInfo.anonymous &&
    state.dataLoaded
  );

export {
  userIDsToRelativeUserInfos,
  relativeMemberInfoSelectorForMembersOfThread,
  userInfoSelectorForPotentialMembers,
  searchIndexFromUserInfos,
  userSearchIndexForPotentialMembers,
  isLoggedIn,
};
