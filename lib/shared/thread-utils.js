// @flow

import invariant from 'invariant';
import _find from 'lodash/fp/find';
import tinycolor from 'tinycolor2';

import {
  permissionLookup,
  getAllThreadPermissions,
} from '../permissions/thread-permissions';
import { userRelationshipStatus } from '../types/relationship-types';
import {
  type RawThreadInfo,
  type ThreadInfo,
  type ThreadPermission,
  type MemberInfo,
  type ServerThreadInfo,
  type RelativeMemberInfo,
  type ThreadCurrentUserInfo,
  type RoleInfo,
  type ServerMemberInfo,
  type ThreadPermissionsInfo,
  threadTypes,
  threadPermissions,
} from '../types/thread-types';
import { type UpdateInfo, updateTypes } from '../types/update-types';
import type { UserInfos } from '../types/user-types';
import { pluralize } from '../utils/text-utils';

function colorIsDark(color: string) {
  return tinycolor(`#${color}`).isDark();
}

// Randomly distributed in RGB-space
const hexNumerals = '0123456789abcdef';
function generateRandomColor() {
  let color = '';
  for (let i = 0; i < 6; i++) {
    color += hexNumerals[Math.floor(Math.random() * 16)];
  }
  return color;
}

function generatePendingThreadColor(userID: string, viewerID: string) {
  const ids =
    userID < viewerID ? `${userID}#${viewerID}` : `${viewerID}#${userID}`;
  let hash = 0;
  for (let i = 0; i < ids.length; i++) {
    hash = 1009 * hash + ids.charCodeAt(i) * 83;
    hash %= 1000000007;
  }
  const hashString = hash.toString(16);
  return hashString.substring(hashString.length - 6).padStart(6, '8');
}

function threadHasPermission(
  threadInfo: ?(ThreadInfo | RawThreadInfo),
  permission: ThreadPermission,
): boolean {
  invariant(
    !permissionsDisabledByBlock.has(permission) || threadInfo?.uiName,
    `${permission} can be disabled by a block, but threadHasPermission can't ` +
      'check for a block on RawThreadInfo. Please pass in ThreadInfo instead!',
  );
  if (!threadInfo || !threadInfo.currentUser.permissions[permission]) {
    return false;
  }
  return threadInfo.currentUser.permissions[permission].value;
}

function viewerIsMember(threadInfo: ?(ThreadInfo | RawThreadInfo)): boolean {
  return !!(
    threadInfo &&
    threadInfo.currentUser.role !== null &&
    threadInfo.currentUser.role !== undefined
  );
}

function threadIsInHome(threadInfo: ?(ThreadInfo | RawThreadInfo)): boolean {
  return !!(threadInfo && threadInfo.currentUser.subscription.home);
}

// Can have messages
function threadInChatList(threadInfo: ?(ThreadInfo | RawThreadInfo)): boolean {
  return (
    viewerIsMember(threadInfo) &&
    threadHasPermission(threadInfo, threadPermissions.VISIBLE)
  );
}

function threadIsTopLevel(threadInfo: ?(ThreadInfo | RawThreadInfo)): boolean {
  return !!(
    threadInChatList(threadInfo) &&
    threadInfo &&
    threadInfo.type !== threadTypes.SIDEBAR
  );
}

function threadInBackgroundChatList(
  threadInfo: ?(ThreadInfo | RawThreadInfo),
): boolean {
  return threadInChatList(threadInfo) && !threadIsInHome(threadInfo);
}

function threadInHomeChatList(
  threadInfo: ?(ThreadInfo | RawThreadInfo),
): boolean {
  return threadInChatList(threadInfo) && threadIsInHome(threadInfo);
}

// Can have Calendar entries,
// does appear as a top-level entity in the thread list
function threadInFilterList(
  threadInfo: ?(ThreadInfo | RawThreadInfo),
): boolean {
  return (
    threadInChatList(threadInfo) &&
    !!threadInfo &&
    threadInfo.type !== threadTypes.SIDEBAR
  );
}

function userIsMember(
  threadInfo: ?(ThreadInfo | RawThreadInfo),
  userID: string,
): boolean {
  if (!threadInfo) {
    return false;
  }
  return threadInfo.members.some(
    (member) =>
      member.id === userID && member.role !== null && member.role !== undefined,
  );
}

function threadActualMembers(
  memberInfos: $ReadOnlyArray<MemberInfo>,
): $ReadOnlyArray<string> {
  return memberInfos
    .filter(
      (memberInfo) => memberInfo.role !== null && memberInfo.role !== undefined,
    )
    .map((memberInfo) => memberInfo.id);
}

function threadIsGroupChat(threadInfo: ThreadInfo | RawThreadInfo) {
  return (
    threadInfo.members.filter(
      (member) =>
        member.role || member.permissions[threadPermissions.VOICED]?.value,
    ).length > 2
  );
}

function threadOrParentThreadIsGroupChat(
  threadInfo: RawThreadInfo | ThreadInfo,
) {
  return threadInfo.members.length > 2;
}

function threadIsPending(threadID: ?string) {
  return threadID?.startsWith('pending');
}

function threadIsPersonalAndPending(threadInfo: ?(ThreadInfo | RawThreadInfo)) {
  return (
    threadInfo?.type === threadTypes.PERSONAL && threadIsPending(threadInfo?.id)
  );
}

function getPendingPersonalThreadOtherUser(
  threadInfo: ThreadInfo | RawThreadInfo,
) {
  invariant(
    threadIsPersonalAndPending(threadInfo),
    'Thread should be personal and pending',
  );

  const otherUserID = threadInfo.id.split('/')[1];
  invariant(
    otherUserID,
    'Pending thread should contain other member id in its id',
  );
  return otherUserID;
}

function getSingleOtherUser(
  threadInfo: ThreadInfo | RawThreadInfo,
  viewerID: ?string,
) {
  if (!viewerID) {
    return undefined;
  }

  const otherMemberIDs = threadInfo.members
    .map((member) => member.id)
    .filter((id) => id !== viewerID);
  if (otherMemberIDs.length !== 1) {
    return undefined;
  }
  return otherMemberIDs[0];
}

type RawThreadInfoOptions = {|
  +includeVisibilityRules?: ?boolean,
  +filterMemberList?: ?boolean,
|};
function rawThreadInfoFromServerThreadInfo(
  serverThreadInfo: ServerThreadInfo,
  viewerID: string,
  options?: RawThreadInfoOptions,
): ?RawThreadInfo {
  const includeVisibilityRules = options?.includeVisibilityRules;
  const filterMemberList = options?.filterMemberList;

  const members = [];
  let currentUser;
  for (const serverMember of serverThreadInfo.members) {
    if (
      filterMemberList &&
      serverMember.id !== viewerID &&
      !serverMember.role &&
      !memberHasAdminPowers(serverMember)
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

  const rawThreadInfo = {
    id: serverThreadInfo.id,
    type: serverThreadInfo.type,
    name: serverThreadInfo.name,
    description: serverThreadInfo.description,
    color: serverThreadInfo.color,
    creationTime: serverThreadInfo.creationTime,
    parentThreadID: serverThreadInfo.parentThreadID,
    members,
    roles: serverThreadInfo.roles,
    currentUser,
  };
  if (!includeVisibilityRules) {
    return rawThreadInfo;
  }
  return ({
    ...rawThreadInfo,
    visibilityRules: rawThreadInfo.type,
  }: any);
}

function robotextName(
  threadInfo: RawThreadInfo | ThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
): string {
  const threadUsernames: string[] = threadInfo.members
    .filter(
      (threadMember) =>
        threadMember.id !== viewerID &&
        (threadMember.role || memberHasAdminPowers(threadMember)),
    )
    .map(
      (threadMember) =>
        userInfos[threadMember.id] && userInfos[threadMember.id].username,
    )
    .filter(Boolean);
  if (threadUsernames.length === 0) {
    return 'just you';
  }
  return pluralize(threadUsernames);
}

function threadUIName(
  threadInfo: RawThreadInfo | ThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
): string {
  if (threadInfo.name) {
    return threadInfo.name;
  }
  return robotextName(threadInfo, viewerID, userInfos);
}

function threadInfoFromRawThreadInfo(
  rawThreadInfo: RawThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
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
    currentUser: getCurrentUser(rawThreadInfo, viewerID, userInfos),
  };
}

function getCurrentUser(
  rawThreadInfo: RawThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
): ThreadCurrentUserInfo {
  if (!threadFrozenDueToBlock(rawThreadInfo, viewerID, userInfos)) {
    return rawThreadInfo.currentUser;
  }

  return {
    ...rawThreadInfo.currentUser,
    permissions: {
      ...rawThreadInfo.currentUser.permissions,
      ...disabledPermissions,
    },
  };
}

function threadIsWithBlockedUserOnly(
  threadInfo: RawThreadInfo | ThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
  checkOnlyViewerBlock?: boolean,
): boolean {
  if (
    threadOrParentThreadIsGroupChat(threadInfo) ||
    threadOrParentThreadHasAdminRole(threadInfo)
  ) {
    return false;
  }

  const otherUserID = getSingleOtherUser(threadInfo, viewerID);
  if (!otherUserID) {
    return false;
  }
  const otherUserRelationshipStatus =
    userInfos[otherUserID]?.relationshipStatus;

  if (checkOnlyViewerBlock) {
    return (
      otherUserRelationshipStatus === userRelationshipStatus.BLOCKED_BY_VIEWER
    );
  }

  return (
    otherUserRelationshipStatus === userRelationshipStatus.BLOCKED_BY_VIEWER ||
    otherUserRelationshipStatus === userRelationshipStatus.BLOCKED_VIEWER ||
    otherUserRelationshipStatus === userRelationshipStatus.BOTH_BLOCKED
  );
}

function threadFrozenDueToBlock(
  threadInfo: RawThreadInfo | ThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
): boolean {
  return threadIsWithBlockedUserOnly(threadInfo, viewerID, userInfos);
}

function threadFrozenDueToViewerBlock(
  threadInfo: RawThreadInfo | ThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
): boolean {
  return threadIsWithBlockedUserOnly(threadInfo, viewerID, userInfos, true);
}

function rawThreadInfoFromThreadInfo(threadInfo: ThreadInfo): RawThreadInfo {
  return {
    id: threadInfo.id,
    type: threadInfo.type,
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
    'Anybody in the parent thread can see an open child thread.',
  [threadTypes.CHAT_SECRET]:
    'Only visible to its members and admins of ancestor threads.',
};

function usersInThreadInfo(threadInfo: RawThreadInfo | ThreadInfo): string[] {
  const userIDs = new Set();
  for (let member of threadInfo.members) {
    userIDs.add(member.id);
  }
  return [...userIDs];
}

function memberIsAdmin(
  memberInfo: RelativeMemberInfo | MemberInfo,
  threadInfo: ThreadInfo | RawThreadInfo,
) {
  return memberInfo.role && roleIsAdminRole(threadInfo.roles[memberInfo.role]);
}

// Since we don't have access to all of the ancestor ThreadInfos, we approximate
// "parent admin" as anybody with CHANGE_ROLE permissions.
function memberHasAdminPowers(
  memberInfo: RelativeMemberInfo | MemberInfo | ServerMemberInfo,
): boolean {
  return !!memberInfo.permissions[threadPermissions.CHANGE_ROLE]?.value;
}

function roleIsAdminRole(roleInfo: ?RoleInfo) {
  return roleInfo && !roleInfo.isDefault && roleInfo.name === 'Admins';
}

function threadHasAdminRole(
  threadInfo: ?(RawThreadInfo | ThreadInfo | ServerThreadInfo),
) {
  if (!threadInfo) {
    return false;
  }
  return _find({ name: 'Admins' })(threadInfo.roles);
}

function threadOrParentThreadHasAdminRole(
  threadInfo: RawThreadInfo | ThreadInfo,
) {
  return (
    threadInfo.members.filter((member) => memberHasAdminPowers(member)).length >
    0
  );
}

function identifyInvalidatedThreads(
  updateInfos: $ReadOnlyArray<UpdateInfo>,
): Set<string> {
  const invalidated = new Set();
  for (const updateInfo of updateInfos) {
    if (updateInfo.type === updateTypes.DELETE_THREAD) {
      invalidated.add(updateInfo.threadID);
    }
  }
  return invalidated;
}

const permissionsDisabledByBlockArray = [
  threadPermissions.VOICED,
  threadPermissions.EDIT_ENTRIES,
  threadPermissions.EDIT_THREAD,
  threadPermissions.CREATE_SUBTHREADS,
  threadPermissions.CREATE_SIDEBARS,
  threadPermissions.JOIN_THREAD,
  threadPermissions.EDIT_PERMISSIONS,
  threadPermissions.ADD_MEMBERS,
  threadPermissions.REMOVE_MEMBERS,
];

const permissionsDisabledByBlock: Set<ThreadPermission> = new Set(
  permissionsDisabledByBlockArray,
);

const disabledPermissions: ThreadPermissionsInfo = permissionsDisabledByBlockArray.reduce(
  (permissions: ThreadPermissionsInfo, permission: string) => ({
    ...permissions,
    [permission]: { value: false, source: null },
  }),
  {},
);

// Consider updating itemHeight in native/chat/chat-thread-list.react.js
// if you change this
const emptyItemText =
  `Background threads are just like normal threads, except they don't ` +
  `contribute to your unread count.\n\n` +
  `To move a thread over here, switch the “Background” option in its settings.`;

const threadSearchText = (
  threadInfo: RawThreadInfo | ThreadInfo,
  userInfos: UserInfos,
): string => {
  const searchTextArray = [];
  if (threadInfo.name) {
    searchTextArray.push(threadInfo.name);
  }
  if (threadInfo.description) {
    searchTextArray.push(threadInfo.description);
  }
  for (let member of threadInfo.members) {
    const userInfo = userInfos[member.id];
    if (userInfo && userInfo.username) {
      searchTextArray.push(userInfo.username);
    }
  }
  return searchTextArray.join(' ');
};

export {
  colorIsDark,
  generateRandomColor,
  generatePendingThreadColor,
  threadHasPermission,
  viewerIsMember,
  threadInChatList,
  threadIsTopLevel,
  threadInBackgroundChatList,
  threadInHomeChatList,
  threadIsInHome,
  threadInFilterList,
  userIsMember,
  threadActualMembers,
  threadIsGroupChat,
  threadIsPending,
  threadIsPersonalAndPending,
  getPendingPersonalThreadOtherUser,
  getSingleOtherUser,
  threadFrozenDueToBlock,
  threadFrozenDueToViewerBlock,
  rawThreadInfoFromServerThreadInfo,
  robotextName,
  threadInfoFromRawThreadInfo,
  rawThreadInfoFromThreadInfo,
  threadTypeDescriptions,
  usersInThreadInfo,
  memberIsAdmin,
  memberHasAdminPowers,
  roleIsAdminRole,
  threadHasAdminRole,
  identifyInvalidatedThreads,
  permissionsDisabledByBlock,
  emptyItemText,
  threadSearchText,
};
