// @flow

import _memoize from 'lodash/memoize.js';
import { createSelector } from 'reselect';

import {
  getAvatarForUser,
  getRandomDefaultEmojiAvatar,
} from '../shared/avatar-utils.js';
import SearchIndex from '../shared/search-index.js';
import {
  getSingleOtherUser,
  memberHasAdminPowers,
} from '../shared/thread-utils.js';
import type { ClientEmojiAvatar } from '../types/avatar-types';
import type { BaseAppState } from '../types/redux-types.js';
import { userRelationshipStatus } from '../types/relationship-types.js';
import {
  type RawThreadInfo,
  type RelativeMemberInfo,
  threadTypes,
} from '../types/thread-types.js';
import type {
  UserInfos,
  RelativeUserInfo,
  AccountUserInfo,
  CurrentUserInfo,
} from '../types/user-types.js';

// Used for specific message payloads that include an array of user IDs, ie.
// array of initial users, array of added users
function userIDsToRelativeUserInfos(
  userIDs: $ReadOnlyArray<string>,
  viewerID: ?string,
  userInfos: UserInfos,
): RelativeUserInfo[] {
  const relativeUserInfos = [];
  for (const userID of userIDs) {
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

function getRelativeMemberInfos(
  threadInfo: ?RawThreadInfo,
  currentUserID: ?string,
  userInfos: UserInfos,
): $ReadOnlyArray<RelativeMemberInfo> {
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
        isSender: memberInfo.isSender,
      });
    } else {
      relativeMemberInfos.push({
        id: memberInfo.id,
        role: memberInfo.role,
        permissions: memberInfo.permissions,
        username,
        isViewer: false,
        isSender: memberInfo.isSender,
      });
    }
  }
  return relativeMemberInfos;
}

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
    getRelativeMemberInfos,
  );
};

const relativeMemberInfoSelectorForMembersOfThread: (
  threadID: ?string,
) => (state: BaseAppState<*>) => $ReadOnlyArray<RelativeMemberInfo> = _memoize(
  baseRelativeMemberInfoSelectorForMembersOfThread,
);

const userInfoSelectorForPotentialMembers: (state: BaseAppState<*>) => {
  [id: string]: AccountUserInfo,
} = createSelector(
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

const isLoggedIn = (state: BaseAppState<*>): boolean =>
  !!(
    state.currentUserInfo &&
    !state.currentUserInfo.anonymous &&
    state.dataLoaded
  );

const userStoreSearchIndex: (state: BaseAppState<*>) => SearchIndex =
  createSelector(
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

const usersWithPersonalThreadSelector: (
  state: BaseAppState<*>,
) => $ReadOnlySet<string> = createSelector(
  state => state.currentUserInfo && state.currentUserInfo.id,
  state => state.threadStore.threadInfos,
  (viewerID, threadInfos) => {
    const personalThreadMembers = new Set();

    for (const threadID in threadInfos) {
      const thread = threadInfos[threadID];
      if (
        thread.type !== threadTypes.PERSONAL ||
        !thread.members.find(member => member.id === viewerID)
      ) {
        continue;
      }
      const otherMemberID = getSingleOtherUser(thread, viewerID);
      if (otherMemberID) {
        personalThreadMembers.add(otherMemberID);
      }
    }
    return personalThreadMembers;
  },
);

const savedEmojiAvatarSelectorForCurrentUser: (
  state: BaseAppState<*>,
) => () => ClientEmojiAvatar = createSelector(
  (state: BaseAppState<*>) => state.currentUserInfo && state.currentUserInfo,
  (currentUser: ?CurrentUserInfo) => {
    return () => {
      let userAvatar = getAvatarForUser(currentUser);
      if (userAvatar.type !== 'emoji') {
        userAvatar = getRandomDefaultEmojiAvatar();
      }
      return userAvatar;
    };
  },
);

export {
  userIDsToRelativeUserInfos,
  getRelativeMemberInfos,
  relativeMemberInfoSelectorForMembersOfThread,
  userInfoSelectorForPotentialMembers,
  userSearchIndexForPotentialMembers,
  isLoggedIn,
  userStoreSearchIndex,
  usersWithPersonalThreadSelector,
  savedEmojiAvatarSelectorForCurrentUser,
};
