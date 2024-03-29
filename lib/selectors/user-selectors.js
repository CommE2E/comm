// @flow

import _memoize from 'lodash/memoize.js';
import { createSelector } from 'reselect';

import {
  getAvatarForUser,
  getRandomDefaultEmojiAvatar,
} from '../shared/avatar-utils.js';
import { getSingleOtherUser } from '../shared/thread-utils.js';
import type { ClientEmojiAvatar } from '../types/avatar-types';
import type {
  RelativeMemberInfo,
  RawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import type { BaseAppState } from '../types/redux-types.js';
import { userRelationshipStatus } from '../types/relationship-types.js';
import { threadTypes } from '../types/thread-types-enum.js';
import type { RawThreadInfos } from '../types/thread-types.js';
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
  const relativeUserInfos: RelativeUserInfo[] = [];
  for (const userID of userIDs) {
    const username = userInfos[userID] ? userInfos[userID].username : null;
    const relativeUserInfo = {
      id: userID,
      username,
      isViewer: userID === viewerID,
    };
    if (userID === viewerID) {
      relativeUserInfos.unshift(relativeUserInfo);
    } else {
      relativeUserInfos.push(relativeUserInfo);
    }
  }
  return relativeUserInfos;
}

function getRelativeMemberInfos(
  threadInfo: ?RawThreadInfo,
  currentUserID: ?string,
  userInfos: UserInfos,
): $ReadOnlyArray<RelativeMemberInfo> {
  const relativeMemberInfos: RelativeMemberInfo[] = [];
  if (!threadInfo) {
    return relativeMemberInfos;
  }
  const memberInfos = threadInfo.members;
  for (const memberInfo of memberInfos) {
    if (!memberInfo.role) {
      continue;
    }
    const username = userInfos[memberInfo.id]
      ? userInfos[memberInfo.id].username
      : null;
    if (memberInfo.id === currentUserID) {
      relativeMemberInfos.unshift({
        ...memberInfo,
        username,
        isViewer: true,
      });
    } else {
      relativeMemberInfos.push({
        ...memberInfo,
        username,
        isViewer: false,
      });
    }
  }
  return relativeMemberInfos;
}

const emptyArray: $ReadOnlyArray<RelativeMemberInfo> = [];

// Includes current user at the start
const baseRelativeMemberInfoSelectorForMembersOfThread: (
  threadID: ?string,
) => (state: BaseAppState<>) => $ReadOnlyArray<RelativeMemberInfo> = (
  threadID: ?string,
) => {
  if (!threadID) {
    return () => emptyArray;
  }
  return createSelector(
    (state: BaseAppState<>) => state.threadStore.threadInfos[threadID],
    (state: BaseAppState<>) =>
      state.currentUserInfo && state.currentUserInfo.id,
    (state: BaseAppState<>) => state.userStore.userInfos,
    getRelativeMemberInfos,
  );
};

const relativeMemberInfoSelectorForMembersOfThread: (
  threadID: ?string,
) => (state: BaseAppState<>) => $ReadOnlyArray<RelativeMemberInfo> = _memoize(
  baseRelativeMemberInfoSelectorForMembersOfThread,
);

const userInfoSelectorForPotentialMembers: (state: BaseAppState<>) => {
  [id: string]: AccountUserInfo,
} = createSelector(
  (state: BaseAppState<>) => state.userStore.userInfos,
  (state: BaseAppState<>) => state.currentUserInfo && state.currentUserInfo.id,
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

const isLoggedIn = (state: BaseAppState<>): boolean =>
  !!(
    state.currentUserInfo &&
    !state.currentUserInfo.anonymous &&
    state.dataLoaded
  );

const isLoggedInToKeyserver: (
  keyserverID: ?string,
) => (state: BaseAppState<>) => boolean = _memoize(
  (keyserverID: ?string) => (state: BaseAppState<>) => {
    if (!keyserverID) {
      return false;
    }
    const cookie = state.keyserverStore.keyserverInfos[keyserverID]?.cookie;
    return !!cookie && cookie.startsWith('user=');
  },
);

const usersWithPersonalThreadSelector: (
  state: BaseAppState<>,
) => $ReadOnlySet<string> = createSelector(
  (state: BaseAppState<>) => state.currentUserInfo && state.currentUserInfo.id,
  (state: BaseAppState<>) => state.threadStore.threadInfos,
  (viewerID: ?string, threadInfos: RawThreadInfos) => {
    const personalThreadMembers = new Set<string>();

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
  state: BaseAppState<>,
) => () => ClientEmojiAvatar = createSelector(
  (state: BaseAppState<>) => state.currentUserInfo && state.currentUserInfo,
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
  isLoggedIn,
  isLoggedInToKeyserver,
  usersWithPersonalThreadSelector,
  savedEmojiAvatarSelectorForCurrentUser,
};
