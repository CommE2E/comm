// @flow

import {
  type RawThreadInfo,
  type ThreadInfo,
  type ThreadPermission,
  type MemberInfo,
  type ServerThreadInfo,
  threadTypes,
  threadPermissions,
} from '../types/thread-types';
import type { UserInfo } from '../types/user-types';

import Color from 'color';

import { pluralize } from '../utils/text-utils';
import {
  permissionLookup,
  getAllThreadPermissions,
} from '../permissions/thread-permissions';

function colorIsDark(color: string) {
  return Color(`#${color}`).dark();
}

// Randomly distributed in RGB-space
const hexNumerals = '0123456789abcdef';
function generateRandomColor() {
  let color = "";
  for (let i = 0; i < 6; i++) {
    color += hexNumerals[Math.floor(Math.random() * 16)];
  }
  return color;
}

function threadHasPermission(
  threadInfo: ?(ThreadInfo | RawThreadInfo),
  permission: ThreadPermission,
) {
  if (
    !threadInfo ||
    !threadInfo.currentUser.permissions[permission]
  ) {
    return false;
  }
  return threadInfo.currentUser.permissions[permission].value;
}

function viewerIsMember(threadInfo: ?(ThreadInfo | RawThreadInfo)) {
  return threadInfo &&
    threadInfo.currentUser.role !== null &&
    threadInfo.currentUser.role !== undefined;
}

function viewerCanSeeThread(threadInfo: ?(ThreadInfo | RawThreadInfo)) {
  return viewerIsMember(threadInfo) &&
    threadHasPermission(threadInfo, threadPermissions.VISIBLE);
}

function userIsMember(
  threadInfo: ?(ThreadInfo | RawThreadInfo),
  userID: string,
) {
  if (!threadInfo) {
    return false;
  }
  return threadInfo &&
    threadInfo.members.some(
      member => member.id === userID &&
        member.role !== null &&
        member.role !== undefined,
    );
}

function threadActualMembers(memberInfos: $ReadOnlyArray<MemberInfo>) {
  return memberInfos
    .filter(
      memberInfo => memberInfo.role !== null && memberInfo.role !== undefined,
    )
    .map(memberInfo => memberInfo.id);
}

function threadIsPersonalChat(threadInfo: ThreadInfo | RawThreadInfo) {
  return threadInfo.members.length === 1;
}

function threadIsTwoPersonChat(threadInfo: ThreadInfo | RawThreadInfo) {
  return threadInfo.members.length === 2;
}

function rawThreadInfoFromServerThreadInfo(
  serverThreadInfo: ServerThreadInfo,
  viewerID: string,
): ?RawThreadInfo {
  const members = [];
  let currentUser;
  for (let serverMember of serverThreadInfo.members) {
    // This is a hack, similar to what we have in ThreadSettingsMember.
    // Basically we only want to return users that are either a member of this
    // thread, or are a "parent admin". We approximate "parent admin" by
    // looking for the PERMISSION_CHANGE_ROLE permission.
    if (
      serverMember.id !== viewerID &&
      !serverMember.role &&
      !serverMember.permissions[threadPermissions.CHANGE_ROLE].value
    ) {
      continue;
    }
    members.push({
      id: serverMember.id,
      role: serverMember.role,
      permissions: serverMember.permissions,
    });
    if (serverMember.id === viewerID) {
      currentUser = {
        role: serverMember.role,
        permissions: serverMember.permissions,
        subscription: serverMember.subscription,
        unread: serverMember.unread,
      };
    }
  }

  let currentUserPermissions;
  if (currentUser) {
    currentUserPermissions = currentUser.permissions;
  } else {
    currentUserPermissions = getAllThreadPermissions(null, serverThreadInfo.id);
    currentUser = {
      role: null,
      permissions: currentUserPermissions,
      subscription: {
        home: false,
        pushNotifs: false,
      },
      unread: null,
    };
  }
  if (!permissionLookup(currentUserPermissions, threadPermissions.KNOW_OF)) {
    return null;
  }

  return {
    id: serverThreadInfo.id,
    type: serverThreadInfo.type,
    visibilityRules: serverThreadInfo.type,
    name: serverThreadInfo.name,
    description: serverThreadInfo.description,
    color: serverThreadInfo.color,
    creationTime: serverThreadInfo.creationTime,
    parentThreadID: serverThreadInfo.parentThreadID,
    members,
    roles: serverThreadInfo.roles,
    currentUser,
  };
}

function robotextName(
  threadInfo: RawThreadInfo | ThreadInfo,
  viewerID: ?string,
  userInfos: {[id: string]: UserInfo},
): string {
  const threadUsernames: string[] = threadInfo.members
    .filter(threadMember => threadMember.id !== viewerID)
    .map(
      threadMember => userInfos[threadMember.id] &&
        userInfos[threadMember.id].username,
    ).filter(Boolean);
  if (threadUsernames.length === 0) {
    return "just you";
  }
  return pluralize(threadUsernames);
}

function threadUIName(
  threadInfo: RawThreadInfo | ThreadInfo,
  viewerID: ?string,
  userInfos: {[id: string]: UserInfo},
): string {
  if (threadInfo.name) {
    return threadInfo.name;
  }
  return robotextName(
    threadInfo,
    viewerID,
    userInfos,
  );
}

function threadInfoFromRawThreadInfo(
  rawThreadInfo: RawThreadInfo,
  viewerID: ?string,
  userInfos: {[id: string]: UserInfo},
): ThreadInfo {
  return {
    id: rawThreadInfo.id,
    type: rawThreadInfo.type,
    name: rawThreadInfo.name,
    uiName: threadUIName(rawThreadInfo, viewerID, userInfos),
    description: rawThreadInfo.description,
    color: rawThreadInfo.color,
    creationTime: rawThreadInfo.creationTime,
    parentThreadID: rawThreadInfo.parentThreadID,
    members: rawThreadInfo.members,
    roles: rawThreadInfo.roles,
    currentUser: rawThreadInfo.currentUser,
  };
}

function rawThreadInfoFromThreadInfo(threadInfo: ThreadInfo): RawThreadInfo {
  return {
    id: threadInfo.id,
    type: threadInfo.type,
    visibilityRules: threadInfo.type,
    name: threadInfo.name,
    description: threadInfo.description,
    color: threadInfo.color,
    creationTime: threadInfo.creationTime,
    parentThreadID: threadInfo.parentThreadID,
    members: threadInfo.members,
    roles: threadInfo.roles,
    currentUser: threadInfo.currentUser,
  };
}

const threadTypeDescriptions = {
  [threadTypes.CHAT_NESTED_OPEN]:
    "Anybody in the parent thread can see an open child thread.",
  [threadTypes.CHAT_SECRET]:
    "Only visible to its members and admins of ancestor threads.",
};

export {
  colorIsDark,
  generateRandomColor,
  threadHasPermission,
  viewerIsMember,
  viewerCanSeeThread,
  userIsMember,
  threadActualMembers,
  threadIsPersonalChat,
  threadIsTwoPersonChat,
  rawThreadInfoFromServerThreadInfo,
  robotextName,
  threadInfoFromRawThreadInfo,
  rawThreadInfoFromThreadInfo,
  threadTypeDescriptions,
}
