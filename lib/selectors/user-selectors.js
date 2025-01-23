// @flow

import _memoize from 'lodash/memoize.js';
import { createSelector } from 'reselect';

import bots from '../facts/bots.js';
import {
  getAvatarForUser,
  getRandomDefaultEmojiAvatar,
} from '../shared/avatar-utils.js';
import { getSingleOtherUser } from '../shared/thread-utils.js';
import { type P2PMessageRecipient } from '../tunnelbroker/peer-to-peer-context.js';
import {
  type AuxUserInfos,
  type AuxUserInfo,
} from '../types/aux-user-types.js';
import type { ClientEmojiAvatar } from '../types/avatar-types';
import {
  type IdentityPlatformDetails,
  identityDeviceTypes,
  type RawDeviceList,
} from '../types/identity-service-types.js';
import type {
  RelativeMemberInfo,
  RawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import type { BaseAppState } from '../types/redux-types.js';
import { userRelationshipStatus } from '../types/relationship-types.js';
import { threadTypeIsPersonal } from '../types/thread-types-enum.js';
import type { RawThreadInfos } from '../types/thread-types.js';
import type {
  UserInfos,
  RelativeUserInfo,
  AccountUserInfo,
  CurrentUserInfo,
} from '../types/user-types.js';
import { entries, values } from '../utils/objects.js';

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
    const { id, role, isSender, minimallyEncoded } = memberInfo;
    if (memberInfo.id === currentUserID) {
      relativeMemberInfos.unshift({
        id,
        role,
        isSender,
        minimallyEncoded,
        username,
        isViewer: true,
      });
    } else {
      relativeMemberInfos.push({
        id,
        role,
        isSender,
        minimallyEncoded,
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
  (userInfos: UserInfos): { [id: string]: AccountUserInfo } => {
    const availableUsers: { [id: string]: AccountUserInfo } = {};

    for (const id in userInfos) {
      const { username, relationshipStatus } = userInfos[id];
      if (!username) {
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
        !threadTypeIsPersonal(thread.type) ||
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

const getRelativeUserIDs: (state: BaseAppState<>) => $ReadOnlyArray<string> =
  createSelector(
    (state: BaseAppState<>) => state.userStore.userInfos,
    (userInfos: UserInfos): $ReadOnlyArray<string> => Object.keys(userInfos),
  );

const usersWithMissingDeviceListSelector: (
  state: BaseAppState<>,
) => $ReadOnlyArray<string> = createSelector(
  getRelativeUserIDs,
  (state: BaseAppState<>) => state.auxUserStore.auxUserInfos,
  (
    userIDs: $ReadOnlyArray<string>,
    auxUserInfos: AuxUserInfos,
  ): $ReadOnlyArray<string> =>
    userIDs.filter(
      userID =>
        (!auxUserInfos[userID] || !auxUserInfos[userID].deviceList) &&
        userID !== bots.commbot.userID,
    ),
);

// Foreign Peer Devices are all devices of users we are aware of,
// but not our own devices.
const getForeignPeerDeviceIDs: (
  state: BaseAppState<>,
) => $ReadOnlyArray<string> = createSelector(
  (state: BaseAppState<>) => state.auxUserStore.auxUserInfos,
  (state: BaseAppState<>) => state.currentUserInfo && state.currentUserInfo.id,
  (
    auxUserInfos: AuxUserInfos,
    currentUserID: ?string,
  ): $ReadOnlyArray<string> =>
    entries(auxUserInfos)
      .map(([userID, auxUserInfo]: [string, AuxUserInfo]) =>
        userID !== currentUserID && auxUserInfo.deviceList?.devices
          ? auxUserInfo.deviceList.devices
          : [],
      )
      .flat(),
);

export type DeviceIDAndPlatformDetails = {
  +deviceID: string,
  +platformDetails: ?IdentityPlatformDetails,
};
const getOwnPeerDevices: (
  state: BaseAppState<>,
) => $ReadOnlyArray<DeviceIDAndPlatformDetails> = createSelector(
  (state: BaseAppState<>) => state.auxUserStore.auxUserInfos,
  (state: BaseAppState<>) => state.currentUserInfo && state.currentUserInfo.id,
  (
    auxUserInfos: AuxUserInfos,
    currentUserID: ?string,
  ): $ReadOnlyArray<DeviceIDAndPlatformDetails> => {
    if (!currentUserID) {
      return [];
    }
    const devices = auxUserInfos[currentUserID]?.deviceList?.devices;
    if (!devices) {
      return [];
    }
    return devices.map(deviceID => ({
      deviceID,
      platformDetails:
        auxUserInfos[currentUserID].devicesPlatformDetails?.[deviceID],
    }));
  },
);

const getOwnRawDeviceList: (state: BaseAppState<>) => ?RawDeviceList =
  createSelector(
    (state: BaseAppState<>) => state.auxUserStore.auxUserInfos,
    (state: BaseAppState<>) =>
      state.currentUserInfo && state.currentUserInfo.id,
    (auxUserInfos: AuxUserInfos, currentUserID: ?string): ?RawDeviceList => {
      if (!currentUserID) {
        return null;
      }
      return auxUserInfos[currentUserID]?.deviceList;
    },
  );

function getKeyserverDeviceID(
  devices: $ReadOnlyArray<DeviceIDAndPlatformDetails>,
): ?string {
  const keyserverDevice = devices.find(
    device =>
      device.platformDetails?.deviceType === identityDeviceTypes.KEYSERVER,
  );

  return keyserverDevice ? keyserverDevice.deviceID : null;
}

const getAllPeerDevices: (state: BaseAppState<>) => $ReadOnlyArray<string> =
  createSelector(
    (state: BaseAppState<>) => state.auxUserStore.auxUserInfos,
    (auxUserInfos: AuxUserInfos): $ReadOnlyArray<string> =>
      values(auxUserInfos)
        .map(
          (auxUserInfo: AuxUserInfo) => auxUserInfo.deviceList?.devices ?? [],
        )
        .flat(),
  );

const getAllPeerUserIDAndDeviceIDs: (
  state: BaseAppState<>,
) => $ReadOnlyArray<P2PMessageRecipient> = createSelector(
  (state: BaseAppState<>) => state.auxUserStore.auxUserInfos,
  (auxUserInfos: AuxUserInfos): $ReadOnlyArray<P2PMessageRecipient> =>
    entries(auxUserInfos).flatMap(
      ([userID, { deviceList }]: [string, AuxUserInfo]) =>
        deviceList?.devices.map(deviceID => ({
          userID,
          deviceID,
        })) ?? [],
    ),
);

const getOwnPrimaryDeviceID: (state: BaseAppState<>) => ?string =
  createSelector(
    (state: BaseAppState<>) => state.auxUserStore.auxUserInfos,
    (state: BaseAppState<>) =>
      state.currentUserInfo && state.currentUserInfo.id,
    (auxUserInfos: AuxUserInfos, currentUserID: ?string): ?string =>
      currentUserID && auxUserInfos[currentUserID]?.deviceList?.devices[0],
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
  getRelativeUserIDs,
  usersWithMissingDeviceListSelector,
  getForeignPeerDeviceIDs,
  getOwnPeerDevices,
  getKeyserverDeviceID,
  getAllPeerDevices,
  getAllPeerUserIDAndDeviceIDs,
  getOwnPrimaryDeviceID,
  getOwnRawDeviceList,
};
