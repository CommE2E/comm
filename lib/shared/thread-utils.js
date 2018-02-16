// @flow

import type {
  RawThreadInfo,
  ThreadInfo,
  ThreadPermission,
  MemberInfo,
  ServerThreadInfo,
} from '../types/thread-types';
import type { UserInfo } from '../types/user-types';

import Color from 'color';

import { pluralize } from '../utils/text-utils';
import {
  permissionLookup,
  getAllThreadPermissions,
} from '../permissions/thread-permissions';
import { threadPermissions } from '../types/thread-types';

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

function threadActualMembers(memberInfos: MemberInfo[]) {
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

function threadUIName(
  rawThreadInfo: RawThreadInfo,
  viewerID: ?string,
  userInfos: {[id: string]: UserInfo},
): string {
  if (rawThreadInfo.name) {
    return rawThreadInfo.name;
  }
  const threadUsernames: string[] = rawThreadInfo.members
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

function rawThreadInfoFromServerThreadInfo(
  serverThreadInfo: ServerThreadInfo,
  viewerID: string,
): ?RawThreadInfo {
  const members = [];
  let currentUser;
  for (let serverMember of serverThreadInfo.members) {
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
    currentUserPermissions = getAllThreadPermissions(
      {
        permissions: null,
        visibilityRules: serverThreadInfo.visibilityRules,
      },
      serverThreadInfo.id,
    );
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
    name: serverThreadInfo.name,
    description: serverThreadInfo.description,
    visibilityRules: serverThreadInfo.visibilityRules,
    color: serverThreadInfo.color,
    creationTime: serverThreadInfo.creationTime,
    parentThreadID: serverThreadInfo.parentThreadID,
    members,
    roles: serverThreadInfo.roles,
    currentUser,
  };
}

function threadInfoFromRawThreadInfo(
  rawThreadInfo: RawThreadInfo,
  viewerID: ?string,
  userInfos: {[id: string]: UserInfo},
): ThreadInfo {
  return {
    id: rawThreadInfo.id,
    name: rawThreadInfo.name,
    uiName: threadUIName(rawThreadInfo, viewerID, userInfos),
    description: rawThreadInfo.description,
    visibilityRules: rawThreadInfo.visibilityRules,
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
    name: threadInfo.name,
    description: threadInfo.description,
    visibilityRules: threadInfo.visibilityRules,
    color: threadInfo.color,
    creationTime: threadInfo.creationTime,
    parentThreadID: threadInfo.parentThreadID,
    members: threadInfo.members,
    roles: threadInfo.roles,
    currentUser: threadInfo.currentUser,
  };
}

export {
  colorIsDark,
  generateRandomColor,
  threadHasPermission,
  viewerIsMember,
  userIsMember,
  threadActualMembers,
  threadIsPersonalChat,
  threadIsTwoPersonChat,
  rawThreadInfoFromServerThreadInfo,
  threadInfoFromRawThreadInfo,
  rawThreadInfoFromThreadInfo,
}
