// @flow

import invariant from 'invariant';
import _find from 'lodash/fp/find.js';
import _keyBy from 'lodash/fp/keyBy.js';
import _mapValues from 'lodash/fp/mapValues.js';
import _omit from 'lodash/fp/omit.js';
import _omitBy from 'lodash/fp/omitBy.js';
import * as React from 'react';

import { getUserAvatarForThread } from './avatar-utils.js';
import { generatePendingThreadColor } from './color-utils.js';
import { extractUserMentionsFromText } from './mention-utils.js';
import { relationshipBlockedInEitherDirection } from './relationship-utils.js';
import ashoat from '../facts/ashoat.js';
import genesis from '../facts/genesis.js';
import { useLoggedInUserInfo } from '../hooks/account-hooks.js';
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import {
  hasPermission,
  permissionsToBitmaskHex,
  threadPermissionsFromBitmaskHex,
} from '../permissions/minimally-encoded-thread-permissions.js';
import { specialRoles } from '../permissions/special-roles.js';
import type { SpecialRole } from '../permissions/special-roles.js';
import {
  permissionLookup,
  getAllThreadPermissions,
  makePermissionsBlob,
} from '../permissions/thread-permissions.js';
import type { ChatThreadItem } from '../selectors/chat-selectors.js';
import {
  threadInfoSelector,
  pendingToRealizedThreadIDsSelector,
  threadInfosSelectorForThreadType,
  onScreenThreadInfos,
} from '../selectors/thread-selectors.js';
import {
  getRelativeMemberInfos,
  usersWithPersonalThreadSelector,
} from '../selectors/user-selectors.js';
import type {
  RelativeMemberInfo,
  RawThreadInfo,
  MemberInfo,
  ThreadCurrentUserInfo,
  RoleInfo,
  ThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import {
  decodeMinimallyEncodedRoleInfo,
  minimallyEncodeMemberInfo,
  minimallyEncodeRawThreadInfo,
  minimallyEncodeRoleInfo,
  minimallyEncodeThreadCurrentUserInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { userRelationshipStatus } from '../types/relationship-types.js';
import {
  threadPermissionPropagationPrefixes,
  threadPermissions,
  configurableCommunityPermissions,
  type ThreadPermission,
  type ThreadPermissionsInfo,
  type ThreadRolePermissionsBlob,
  type UserSurfacedPermission,
  threadPermissionFilterPrefixes,
  threadPermissionsDisabledByBlock,
} from '../types/thread-permission-types.js';
import {
  type ThreadType,
  threadTypes,
  threadTypeIsCommunityRoot,
  assertThreadType,
} from '../types/thread-types-enum.js';
import type {
  LegacyRawThreadInfo,
  ClientLegacyRoleInfo,
  ServerThreadInfo,
  ServerMemberInfo,
  UserProfileThreadInfo,
  MixedRawThreadInfos,
  LegacyMemberInfo,
} from '../types/thread-types.js';
import { updateTypes } from '../types/update-types-enum.js';
import { type ClientUpdateInfo } from '../types/update-types.js';
import type {
  GlobalAccountUserInfo,
  UserInfos,
  AccountUserInfo,
  LoggedInUserInfo,
  UserInfo,
} from '../types/user-types.js';
import {
  ET,
  type ThreadEntity,
  type UserEntity,
} from '../utils/entity-text.js';
import { entries, values } from '../utils/objects.js';
import { useSelector } from '../utils/redux-utils.js';
import { firstLine } from '../utils/string-utils.js';
import { pendingThreadIDRegex } from '../utils/validation-utils.js';

function threadHasPermission(
  threadInfo: ?(ThreadInfo | LegacyRawThreadInfo | RawThreadInfo),
  permission: ThreadPermission,
): boolean {
  if (!threadInfo) {
    return false;
  }
  invariant(
    !permissionsDisabledByBlock.has(permission) || threadInfo?.uiName,
    `${permission} can be disabled by a block, but threadHasPermission can't ` +
      'check for a block on RawThreadInfo. Please pass in ThreadInfo instead!',
  );
  if (threadInfo.minimallyEncoded) {
    return hasPermission(threadInfo.currentUser.permissions, permission);
  }
  return permissionLookup(threadInfo.currentUser.permissions, permission);
}

type CommunityRootMembersToRoleType = {
  +[threadID: ?string]: {
    +[memberID: string]: ?RoleInfo,
  },
};
function useCommunityRootMembersToRole(
  threadInfos: $ReadOnlyArray<RawThreadInfo | ThreadInfo>,
): CommunityRootMembersToRoleType {
  const communityRootMembersToRole = React.useMemo(() => {
    const communityThreadInfos = threadInfos.filter(threadInfo =>
      threadTypeIsCommunityRoot(threadInfo.type),
    );
    const communityRoots = _keyBy('id')(communityThreadInfos);

    return _mapValues((threadInfo: ThreadInfo) => {
      const keyedMembers = _keyBy('id')(threadInfo.members);
      const keyedMembersToRole = _mapValues(
        (member: MemberInfo | RelativeMemberInfo) => {
          return member.role ? threadInfo.roles[member.role] : null;
        },
      )(keyedMembers);
      return keyedMembersToRole;
    })(communityRoots);
  }, [threadInfos]);

  return communityRootMembersToRole;
}

function useThreadsWithPermission(
  threadInfos: $ReadOnlyArray<ThreadInfo>,
  permission: ThreadPermission,
): $ReadOnlyArray<ThreadInfo> {
  const loggedInUserInfo = useLoggedInUserInfo();
  const userInfos = useSelector(state => state.userStore.userInfos);
  const allThreadInfos = useSelector(state => state.threadStore.threadInfos);
  const allThreadInfosArray = React.useMemo(
    () => values(allThreadInfos),
    [allThreadInfos],
  );

  const communityRootMembersToRole =
    useCommunityRootMembersToRole(allThreadInfosArray);

  return React.useMemo(() => {
    return threadInfos.filter((threadInfo: ThreadInfo) => {
      const membersToRole = communityRootMembersToRole[threadInfo.id];
      const memberHasAdminRole = threadMembersWithoutAddedAdmin(
        threadInfo,
      ).some(member => roleIsAdminRole(membersToRole?.[member.id]));

      if (memberHasAdminRole || !loggedInUserInfo) {
        return hasPermission(threadInfo.currentUser.permissions, permission);
      }

      const threadFrozen = threadFrozenDueToBlock(
        threadInfo,
        loggedInUserInfo.id,
        userInfos,
      );

      const permissions = threadFrozen
        ? filterOutDisabledPermissions(threadInfo.currentUser.permissions)
        : threadInfo.currentUser.permissions;

      return hasPermission(permissions, permission);
    });
  }, [
    threadInfos,
    communityRootMembersToRole,
    loggedInUserInfo,
    userInfos,
    permission,
  ]);
}

function useThreadHasPermission(
  threadInfo: ?ThreadInfo,
  permission: ThreadPermission,
): boolean {
  const threads = useThreadsWithPermission(
    threadInfo ? [threadInfo] : [],
    permission,
  );
  return threads.length === 1;
}

function viewerIsMember(
  threadInfo: ?(ThreadInfo | LegacyRawThreadInfo | RawThreadInfo),
): boolean {
  return !!(
    threadInfo &&
    threadInfo.currentUser.role !== null &&
    threadInfo.currentUser.role !== undefined
  );
}

function threadIsInHome(threadInfo: ?(RawThreadInfo | ThreadInfo)): boolean {
  return !!(threadInfo && threadInfo.currentUser.subscription.home);
}

// Can have messages
function threadInChatList(
  threadInfo: ?(LegacyRawThreadInfo | RawThreadInfo | ThreadInfo),
): boolean {
  return (
    viewerIsMember(threadInfo) &&
    threadHasPermission(threadInfo, threadPermissions.VISIBLE)
  );
}

function useIsThreadInChatList(threadInfo: ?ThreadInfo): boolean {
  const threadIsVisible = useThreadHasPermission(
    threadInfo,
    threadPermissions.VISIBLE,
  );
  return viewerIsMember(threadInfo) && threadIsVisible;
}

function useThreadsInChatList(
  threadInfos: $ReadOnlyArray<ThreadInfo>,
): $ReadOnlyArray<ThreadInfo> {
  const visibleThreads = useThreadsWithPermission(
    threadInfos,
    threadPermissions.VISIBLE,
  );
  return React.useMemo(
    () => visibleThreads.filter(viewerIsMember),
    [visibleThreads],
  );
}

function threadIsTopLevel(threadInfo: ?(RawThreadInfo | ThreadInfo)): boolean {
  return threadInChatList(threadInfo) && threadIsChannel(threadInfo);
}

function threadIsChannel(threadInfo: ?(RawThreadInfo | ThreadInfo)): boolean {
  return !!(threadInfo && threadInfo.type !== threadTypes.SIDEBAR);
}

function threadIsSidebar(threadInfo: ?(RawThreadInfo | ThreadInfo)): boolean {
  return threadInfo?.type === threadTypes.SIDEBAR;
}

function threadInBackgroundChatList(
  threadInfo: ?(RawThreadInfo | ThreadInfo),
): boolean {
  return threadInChatList(threadInfo) && !threadIsInHome(threadInfo);
}

function threadInHomeChatList(
  threadInfo: ?(RawThreadInfo | ThreadInfo),
): boolean {
  return threadInChatList(threadInfo) && threadIsInHome(threadInfo);
}

// Can have Calendar entries,
// does appear as a top-level entity in the thread list
function threadInFilterList(
  threadInfo: ?(LegacyRawThreadInfo | RawThreadInfo | ThreadInfo),
): boolean {
  return (
    threadInChatList(threadInfo) &&
    !!threadInfo &&
    threadInfo.type !== threadTypes.SIDEBAR
  );
}

function userIsMember(
  threadInfo: ?(RawThreadInfo | ThreadInfo),
  userID: string,
): boolean {
  if (!threadInfo) {
    return false;
  }
  if (threadInfo.id === genesis().id) {
    return true;
  }
  return threadInfo.members.some(member => member.id === userID && member.role);
}

function threadActualMembers(
  memberInfos: $ReadOnlyArray<MemberInfo | RelativeMemberInfo>,
): $ReadOnlyArray<string> {
  return memberInfos
    .filter(memberInfo => memberInfo.role)
    .map(memberInfo => memberInfo.id);
}

function threadOtherMembers<
  T: LegacyMemberInfo | MemberInfo | RelativeMemberInfo,
>(memberInfos: $ReadOnlyArray<T>, viewerID: ?string): $ReadOnlyArray<T> {
  return memberInfos.filter(
    memberInfo => memberInfo.role && memberInfo.id !== viewerID,
  );
}

function threadMembersWithoutAddedAdmin<
  T: LegacyRawThreadInfo | RawThreadInfo | ThreadInfo,
>(threadInfo: T): $PropertyType<T, 'members'> {
  if (threadInfo.community !== genesis().id) {
    return threadInfo.members;
  }
  const adminID = extractKeyserverIDFromID(threadInfo.id);

  return threadInfo.members.filter(
    member => member.id !== adminID || member.role,
  );
}

function threadIsGroupChat(threadInfo: ThreadInfo): boolean {
  return threadInfo.members.length > 2;
}

function threadOrParentThreadIsGroupChat(
  threadInfo: LegacyRawThreadInfo | RawThreadInfo | ThreadInfo,
) {
  return threadMembersWithoutAddedAdmin(threadInfo).length > 2;
}

function threadIsPending(threadID: ?string): boolean {
  return !!threadID?.startsWith('pending');
}

function threadIsPendingSidebar(threadID: ?string): boolean {
  return !!threadID?.startsWith('pending/sidebar/');
}

function getSingleOtherUser(
  threadInfo: LegacyRawThreadInfo | RawThreadInfo | ThreadInfo,
  viewerID: ?string,
): ?string {
  if (!viewerID) {
    return undefined;
  }
  const otherMembers = threadOtherMembers(threadInfo.members, viewerID);
  if (otherMembers.length !== 1) {
    return undefined;
  }
  return otherMembers[0].id;
}

function getPendingThreadID(
  threadType: ThreadType,
  memberIDs: $ReadOnlyArray<string>,
  sourceMessageID: ?string,
): string {
  const pendingThreadKey = sourceMessageID
    ? `sidebar/${sourceMessageID}`
    : [...memberIDs].sort().join('+');
  const pendingThreadTypeString = sourceMessageID ? '' : `type${threadType}/`;
  return `pending/${pendingThreadTypeString}${pendingThreadKey}`;
}

type PendingThreadIDContents = {
  +threadType: ThreadType,
  +memberIDs: $ReadOnlyArray<string>,
  +sourceMessageID: ?string,
};

function parsePendingThreadID(
  pendingThreadID: string,
): ?PendingThreadIDContents {
  const pendingRegex = new RegExp(`^${pendingThreadIDRegex}$`);
  const pendingThreadIDMatches = pendingRegex.exec(pendingThreadID);
  if (!pendingThreadIDMatches) {
    return null;
  }
  const [threadTypeString, threadKey] = pendingThreadIDMatches[1].split('/');
  const threadType =
    threadTypeString === 'sidebar'
      ? threadTypes.SIDEBAR
      : assertThreadType(Number(threadTypeString.replace('type', '')));
  const memberIDs = threadTypeString === 'sidebar' ? [] : threadKey.split('+');
  const sourceMessageID = threadTypeString === 'sidebar' ? threadKey : null;
  return {
    threadType,
    memberIDs,
    sourceMessageID,
  };
}

type UserIDAndUsername = {
  +id: string,
  +username: string,
  ...
};
type CreatePendingThreadArgs = {
  +viewerID: string,
  +threadType: ThreadType,
  +members: $ReadOnlyArray<UserIDAndUsername>,
  +parentThreadInfo?: ?ThreadInfo,
  +threadColor?: ?string,
  +name?: ?string,
  +sourceMessageID?: string,
};

function createPendingThread({
  viewerID,
  threadType,
  members,
  parentThreadInfo,
  threadColor,
  name,
  sourceMessageID,
}: CreatePendingThreadArgs): ThreadInfo {
  const now = Date.now();
  if (!members.some(member => member.id === viewerID)) {
    throw new Error(
      'createPendingThread should be called with the viewer as a member',
    );
  }

  const memberIDs = members.map(member => member.id);
  const threadID = getPendingThreadID(threadType, memberIDs, sourceMessageID);

  const permissions: ThreadRolePermissionsBlob = {
    [threadPermissions.KNOW_OF]: true,
    [threadPermissions.VISIBLE]: true,
    [threadPermissions.VOICED]: true,
  };

  const membershipPermissions = getAllThreadPermissions(
    makePermissionsBlob(permissions, null, threadID, threadType),
    threadID,
  );
  const role: RoleInfo = {
    ...minimallyEncodeRoleInfo({
      id: `${threadID}/role`,
      name: 'Members',
      permissions,
      isDefault: true,
    }),
    specialRole: specialRoles.DEFAULT_ROLE,
  };

  const rawThreadInfo: RawThreadInfo = {
    minimallyEncoded: true,
    id: threadID,
    type: threadType,
    name: name ?? null,
    description: null,
    color: threadColor ?? generatePendingThreadColor(memberIDs),
    creationTime: now,
    parentThreadID: parentThreadInfo?.id ?? null,
    containingThreadID: getContainingThreadID(parentThreadInfo, threadType),
    community: getCommunity(parentThreadInfo),
    members: members.map(member =>
      minimallyEncodeMemberInfo({
        id: member.id,
        role: role.id,
        permissions: membershipPermissions,
        isSender: false,
      }),
    ),
    roles: {
      [role.id]: role,
    },
    currentUser: minimallyEncodeThreadCurrentUserInfo({
      role: role.id,
      permissions: membershipPermissions,
      subscription: {
        pushNotifs: false,
        home: false,
      },
      unread: false,
    }),
    repliesCount: 0,
    sourceMessageID,
    pinnedCount: 0,
  };

  const userInfos: { [string]: UserInfo } = {};
  for (const member of members) {
    const { id, username } = member;
    userInfos[id] = { id, username };
  }

  return threadInfoFromRawThreadInfo(rawThreadInfo, viewerID, userInfos);
}

type PendingPersonalThread = {
  +threadInfo: ThreadInfo,
  +pendingPersonalThreadUserInfo: UserInfo,
};

function createPendingPersonalThread(
  loggedInUserInfo: LoggedInUserInfo,
  userID: string,
  username: string,
): PendingPersonalThread {
  const pendingPersonalThreadUserInfo = {
    id: userID,
    username: username,
  };

  const threadInfo = createPendingThread({
    viewerID: loggedInUserInfo.id,
    threadType: threadTypes.PERSONAL,
    members: [loggedInUserInfo, pendingPersonalThreadUserInfo],
  });

  return { threadInfo, pendingPersonalThreadUserInfo };
}

function createPendingThreadItem(
  loggedInUserInfo: LoggedInUserInfo,
  user: UserIDAndUsername,
): ChatThreadItem {
  const { threadInfo, pendingPersonalThreadUserInfo } =
    createPendingPersonalThread(loggedInUserInfo, user.id, user.username);

  return {
    type: 'chatThreadItem',
    threadInfo,
    mostRecentMessageInfo: null,
    mostRecentNonLocalMessage: null,
    lastUpdatedTime: threadInfo.creationTime,
    lastUpdatedTimeIncludingSidebars: threadInfo.creationTime,
    sidebars: [],
    pendingPersonalThreadUserInfo,
  };
}

// Returns map from lowercase username to AccountUserInfo
function memberLowercaseUsernameMap(
  members: $ReadOnlyArray<RelativeMemberInfo>,
): Map<string, AccountUserInfo> {
  const memberMap = new Map<string, AccountUserInfo>();
  for (const member of members) {
    const { id, role, username } = member;
    if (!role || !username) {
      continue;
    }
    memberMap.set(username.toLowerCase(), { id, username });
  }
  return memberMap;
}

// Returns map from user ID to AccountUserInfo
function extractMentionedMembers(
  text: string,
  threadInfo: ThreadInfo,
): Map<string, AccountUserInfo> {
  const memberMap = memberLowercaseUsernameMap(threadInfo.members);
  const mentions = extractUserMentionsFromText(text);

  const mentionedMembers = new Map<string, AccountUserInfo>();
  for (const mention of mentions) {
    const userInfo = memberMap.get(mention.toLowerCase());
    if (userInfo) {
      mentionedMembers.set(userInfo.id, userInfo);
    }
  }
  return mentionedMembers;
}

// When a member of the parent is mentioned in a sidebar,
// they will be automatically added to that sidebar
function extractNewMentionedParentMembers(
  messageText: string,
  threadInfo: ThreadInfo,
  parentThreadInfo: ThreadInfo,
): AccountUserInfo[] {
  const mentionedMembersOfParent = extractMentionedMembers(
    messageText,
    parentThreadInfo,
  );
  for (const member of threadInfo.members) {
    if (member.role) {
      mentionedMembersOfParent.delete(member.id);
    }
  }
  return [...mentionedMembersOfParent.values()];
}

function pendingThreadType(numberOfOtherMembers: number): 4 | 6 | 7 {
  if (numberOfOtherMembers === 0) {
    return threadTypes.PRIVATE;
  } else if (numberOfOtherMembers === 1) {
    return threadTypes.PERSONAL;
  } else {
    return threadTypes.LOCAL;
  }
}

function threadTypeCanBePending(threadType: ThreadType): boolean {
  return (
    threadType === threadTypes.PERSONAL ||
    threadType === threadTypes.LOCAL ||
    threadType === threadTypes.SIDEBAR ||
    threadType === threadTypes.PRIVATE
  );
}

type RawThreadInfoOptions = {
  +filterThreadEditAvatarPermission?: boolean,
  +excludePinInfo?: boolean,
  +filterManageInviteLinksPermission?: boolean,
  +filterVoicedInAnnouncementChannelsPermission?: boolean,
  +minimallyEncodePermissions?: boolean,
  +includeSpecialRoleFieldInRoles?: boolean,
};

function rawThreadInfoFromServerThreadInfo(
  serverThreadInfo: ServerThreadInfo,
  viewerID: string,
  options?: RawThreadInfoOptions,
): ?LegacyRawThreadInfo | ?RawThreadInfo {
  const filterThreadEditAvatarPermission =
    options?.filterThreadEditAvatarPermission;
  const excludePinInfo = options?.excludePinInfo;
  const filterManageInviteLinksPermission =
    options?.filterManageInviteLinksPermission;
  const filterVoicedInAnnouncementChannelsPermission =
    options?.filterVoicedInAnnouncementChannelsPermission;
  const shouldMinimallyEncodePermissions = options?.minimallyEncodePermissions;
  const shouldIncludeSpecialRoleFieldInRoles =
    options?.includeSpecialRoleFieldInRoles;

  const filterThreadPermissions = _omitBy(
    (v, k) =>
      (filterThreadEditAvatarPermission &&
        [
          threadPermissions.EDIT_THREAD_AVATAR,
          threadPermissionPropagationPrefixes.DESCENDANT +
            threadPermissions.EDIT_THREAD_AVATAR,
        ].includes(k)) ||
      (excludePinInfo &&
        [
          threadPermissions.MANAGE_PINS,
          threadPermissionPropagationPrefixes.DESCENDANT +
            threadPermissions.MANAGE_PINS,
        ].includes(k)) ||
      (filterManageInviteLinksPermission &&
        [threadPermissions.MANAGE_INVITE_LINKS].includes(k)) ||
      (filterVoicedInAnnouncementChannelsPermission &&
        [
          threadPermissions.VOICED_IN_ANNOUNCEMENT_CHANNELS,
          threadPermissionPropagationPrefixes.DESCENDANT +
            threadPermissionFilterPrefixes.TOP_LEVEL +
            threadPermissions.VOICED_IN_ANNOUNCEMENT_CHANNELS,
        ].includes(k)),
  );

  const members = [];
  let currentUser;
  for (const serverMember of serverThreadInfo.members) {
    if (
      serverThreadInfo.id === genesis().id &&
      serverMember.id !== viewerID &&
      serverMember.id !== ashoat.id
    ) {
      continue;
    }

    const memberPermissions = filterThreadPermissions(serverMember.permissions);

    members.push({
      id: serverMember.id,
      role: serverMember.role,
      permissions: memberPermissions,
      isSender: serverMember.isSender,
    });
    if (serverMember.id === viewerID) {
      currentUser = {
        role: serverMember.role,
        permissions: memberPermissions,
        subscription: serverMember.subscription,
        unread: serverMember.unread,
      };
    }
  }

  let currentUserPermissions;
  if (currentUser) {
    currentUserPermissions = currentUser.permissions;
  } else {
    currentUserPermissions = filterThreadPermissions(
      getAllThreadPermissions(null, serverThreadInfo.id),
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

  const rolesWithFilteredThreadPermissions = _mapValues(role => ({
    ...role,
    permissions: filterThreadPermissions(role.permissions),
  }))(serverThreadInfo.roles);

  const rolesWithoutSpecialRoleField = _mapValues(role => {
    const { specialRole, ...roleSansSpecialRole } = role;
    return roleSansSpecialRole;
  })(rolesWithFilteredThreadPermissions);

  let rawThreadInfo: any = {
    id: serverThreadInfo.id,
    type: serverThreadInfo.type,
    name: serverThreadInfo.name,
    description: serverThreadInfo.description,
    color: serverThreadInfo.color,
    creationTime: serverThreadInfo.creationTime,
    parentThreadID: serverThreadInfo.parentThreadID,
    members,
    roles: rolesWithoutSpecialRoleField,
    currentUser,
    repliesCount: serverThreadInfo.repliesCount,
    containingThreadID: serverThreadInfo.containingThreadID,
    community: serverThreadInfo.community,
  };
  const sourceMessageID = serverThreadInfo.sourceMessageID;
  if (sourceMessageID) {
    rawThreadInfo = { ...rawThreadInfo, sourceMessageID };
  }
  if (serverThreadInfo.avatar) {
    rawThreadInfo = { ...rawThreadInfo, avatar: serverThreadInfo.avatar };
  }
  if (!excludePinInfo) {
    rawThreadInfo = {
      ...rawThreadInfo,
      pinnedCount: serverThreadInfo.pinnedCount,
    };
  }

  if (!shouldMinimallyEncodePermissions) {
    return rawThreadInfo;
  }

  const minimallyEncoded = minimallyEncodeRawThreadInfo(rawThreadInfo);
  if (shouldIncludeSpecialRoleFieldInRoles) {
    return minimallyEncoded;
  }

  const minimallyEncodedRolesWithoutSpecialRoleField = Object.fromEntries(
    entries(minimallyEncoded.roles).map(([key, role]) => [
      key,
      {
        ..._omit('specialRole')(role),
        isDefault: roleIsDefaultRole(role),
      },
    ]),
  );

  return {
    ...minimallyEncoded,
    roles: minimallyEncodedRolesWithoutSpecialRoleField,
  };
}

function threadUIName(threadInfo: ThreadInfo): string | ThreadEntity {
  if (threadInfo.name) {
    return firstLine(threadInfo.name);
  }

  const threadMembers: $ReadOnlyArray<RelativeMemberInfo> =
    threadInfo.members.filter(memberInfo => memberInfo.role);
  const memberEntities: $ReadOnlyArray<UserEntity> = threadMembers.map(member =>
    ET.user({ userInfo: member }),
  );

  return {
    type: 'thread',
    id: threadInfo.id,
    name: threadInfo.name,
    display: 'uiName',
    uiName: memberEntities,
    ifJustViewer:
      threadInfo.type === threadTypes.PRIVATE
        ? 'viewer_username'
        : 'just_you_string',
  };
}

function threadInfoFromRawThreadInfo(
  rawThreadInfo: RawThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
): ThreadInfo {
  let threadInfo: ThreadInfo = {
    minimallyEncoded: true,
    id: rawThreadInfo.id,
    type: rawThreadInfo.type,
    name: rawThreadInfo.name,
    uiName: '',
    description: rawThreadInfo.description,
    color: rawThreadInfo.color,
    creationTime: rawThreadInfo.creationTime,
    parentThreadID: rawThreadInfo.parentThreadID,
    containingThreadID: rawThreadInfo.containingThreadID,
    community: rawThreadInfo.community,
    members: getRelativeMemberInfos(rawThreadInfo, viewerID, userInfos),
    roles: rawThreadInfo.roles,
    currentUser: getCurrentUser(rawThreadInfo, viewerID, userInfos),
    repliesCount: rawThreadInfo.repliesCount,
  };

  threadInfo = {
    ...threadInfo,
    uiName: threadUIName(threadInfo),
  };
  const { sourceMessageID, avatar, pinnedCount } = rawThreadInfo;
  if (sourceMessageID) {
    threadInfo = { ...threadInfo, sourceMessageID };
  }

  if (avatar) {
    threadInfo = { ...threadInfo, avatar };
  } else if (
    rawThreadInfo.type === threadTypes.PERSONAL ||
    rawThreadInfo.type === threadTypes.PRIVATE
  ) {
    threadInfo = {
      ...threadInfo,
      avatar: getUserAvatarForThread(rawThreadInfo, viewerID, userInfos),
    };
  }

  if (pinnedCount) {
    threadInfo = { ...threadInfo, pinnedCount };
  }
  return threadInfo;
}

function filterOutDisabledPermissions(permissionsBitmask: string): string {
  const decodedPermissions: ThreadPermissionsInfo =
    threadPermissionsFromBitmaskHex(permissionsBitmask);
  const updatedPermissions = { ...decodedPermissions, ...disabledPermissions };
  const encodedUpdatedPermissions: string =
    permissionsToBitmaskHex(updatedPermissions);
  return encodedUpdatedPermissions;
}

function getCurrentUser(
  threadInfo: RawThreadInfo | ThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
): ThreadCurrentUserInfo {
  if (!threadFrozenDueToBlock(threadInfo, viewerID, userInfos)) {
    return threadInfo.currentUser;
  }
  return {
    ...threadInfo.currentUser,
    permissions: filterOutDisabledPermissions(
      threadInfo.currentUser.permissions,
    ),
  };
}

function threadIsWithBlockedUserOnly(
  threadInfo: LegacyRawThreadInfo | RawThreadInfo | ThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
  checkOnlyViewerBlock: boolean,
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
    !!otherUserRelationshipStatus &&
    relationshipBlockedInEitherDirection(otherUserRelationshipStatus)
  );
}

function threadFrozenDueToBlock(
  threadInfo: LegacyRawThreadInfo | RawThreadInfo | ThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
): boolean {
  return threadIsWithBlockedUserOnly(threadInfo, viewerID, userInfos, false);
}

function threadFrozenDueToViewerBlock(
  threadInfo: RawThreadInfo | ThreadInfo,
  communityThreadInfo: ?(RawThreadInfo | ThreadInfo),
  viewerID: ?string,
  userInfos: UserInfos,
): boolean {
  return threadIsWithBlockedUserOnly(threadInfo, viewerID, userInfos, true);
}

const threadTypeDescriptions: { [ThreadType]: string } = {
  [threadTypes.COMMUNITY_OPEN_SUBTHREAD]:
    'Anybody in the parent channel can see an open subchannel.',
  [threadTypes.COMMUNITY_SECRET_SUBTHREAD]:
    'Only visible to its members and admins of ancestor channels.',
};

// Since we don't have access to all of the ancestor ThreadInfos, we approximate
// "parent admin" as anybody with CHANGE_ROLE permissions.
function memberHasAdminPowers(
  memberInfo:
    | RelativeMemberInfo
    | LegacyMemberInfo
    | MemberInfo
    | ServerMemberInfo,
): boolean {
  if (memberInfo.minimallyEncoded) {
    return hasPermission(memberInfo.permissions, threadPermissions.CHANGE_ROLE);
  }
  return !!memberInfo.permissions[threadPermissions.CHANGE_ROLE]?.value;
}

function roleIsDefaultRole(
  roleInfo: ?ClientLegacyRoleInfo | ?RoleInfo,
): boolean {
  if (roleInfo?.specialRole === specialRoles.DEFAULT_ROLE) {
    return true;
  }
  return !!(roleInfo && roleInfo.isDefault);
}

function roleIsAdminRole(roleInfo: ?ClientLegacyRoleInfo | ?RoleInfo): boolean {
  if (roleInfo?.specialRole === specialRoles.ADMIN_ROLE) {
    return true;
  }
  return !!(roleInfo && !roleInfo.isDefault && roleInfo.name === 'Admins');
}

function threadHasAdminRole(
  threadInfo: ?(
    | LegacyRawThreadInfo
    | RawThreadInfo
    | ThreadInfo
    | ServerThreadInfo
  ),
): boolean {
  if (!threadInfo) {
    return false;
  }
  let hasSpecialRoleFieldBeenEncountered = false;
  for (const role of Object.values(threadInfo.roles)) {
    if (role.specialRole === specialRoles.ADMIN_ROLE) {
      return true;
    }
    if (role.specialRole !== undefined) {
      hasSpecialRoleFieldBeenEncountered = true;
    }
  }
  if (hasSpecialRoleFieldBeenEncountered) {
    return false;
  }
  return !!_find({ name: 'Admins' })(threadInfo.roles);
}

function threadOrParentThreadHasAdminRole(
  threadInfo: LegacyRawThreadInfo | RawThreadInfo | ThreadInfo,
) {
  return (
    threadMembersWithoutAddedAdmin(threadInfo).filter(member =>
      memberHasAdminPowers(member),
    ).length > 0
  );
}

function identifyInvalidatedThreads(
  updateInfos: $ReadOnlyArray<ClientUpdateInfo>,
): Set<string> {
  const invalidated = new Set<string>();
  for (const updateInfo of updateInfos) {
    if (updateInfo.type === updateTypes.DELETE_THREAD) {
      invalidated.add(updateInfo.threadID);
    }
  }
  return invalidated;
}

const permissionsDisabledByBlockArray = values(
  threadPermissionsDisabledByBlock,
);

const permissionsDisabledByBlock: Set<ThreadPermission> = new Set(
  permissionsDisabledByBlockArray,
);

const disabledPermissions: ThreadPermissionsInfo =
  permissionsDisabledByBlockArray.reduce(
    (permissions: ThreadPermissionsInfo, permission: string) => ({
      ...permissions,
      [permission]: { value: false, source: null },
    }),
    {},
  );

// Consider updating itemHeight in native/chat/chat-thread-list.react.js
// if you change this
const emptyItemText: string =
  `Background chats are just like normal chats, except they don't ` +
  `contribute to your unread count.\n\n` +
  `To move a chat over here, switch the “Background” option in its settings.`;

function threadNoun(threadType: ThreadType, parentThreadID: ?string): string {
  if (threadType === threadTypes.SIDEBAR) {
    return 'thread';
  } else if (
    threadType === threadTypes.COMMUNITY_SECRET_SUBTHREAD &&
    parentThreadID === genesis().id
  ) {
    return 'chat';
  } else if (
    threadType === threadTypes.COMMUNITY_ROOT ||
    threadType === threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT ||
    threadType === threadTypes.COMMUNITY_OPEN_SUBTHREAD ||
    threadType === threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD ||
    threadType === threadTypes.COMMUNITY_SECRET_SUBTHREAD ||
    threadType === threadTypes.COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD ||
    threadType === threadTypes.GENESIS
  ) {
    return 'channel';
  } else {
    return 'chat';
  }
}

function threadLabel(threadType: ThreadType): string {
  if (
    threadType === threadTypes.COMMUNITY_OPEN_SUBTHREAD ||
    threadType === threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD
  ) {
    return 'Open';
  } else if (threadType === threadTypes.PERSONAL) {
    return 'Personal';
  } else if (threadType === threadTypes.SIDEBAR) {
    return 'Thread';
  } else if (threadType === threadTypes.PRIVATE) {
    return 'Private';
  } else if (
    threadType === threadTypes.COMMUNITY_ROOT ||
    threadType === threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT ||
    threadType === threadTypes.GENESIS
  ) {
    return 'Community';
  } else {
    return 'Secret';
  }
}

type ExistingThreadInfoFinderParams = {
  +searching: boolean,
  +userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
};
type ExistingThreadInfoFinder = (
  params: ExistingThreadInfoFinderParams,
) => ?ThreadInfo;

function useExistingThreadInfoFinder(
  baseThreadInfo: ?ThreadInfo,
): ExistingThreadInfoFinder {
  const threadInfos = useSelector(threadInfoSelector);
  const loggedInUserInfo = useLoggedInUserInfo();
  const userInfos = useSelector(state => state.userStore.userInfos);

  const pendingToRealizedThreadIDs = useSelector(state =>
    pendingToRealizedThreadIDsSelector(state.threadStore.threadInfos),
  );
  return React.useCallback(
    (params: ExistingThreadInfoFinderParams): ?ThreadInfo => {
      if (!baseThreadInfo) {
        return null;
      }

      const realizedThreadInfo = threadInfos[baseThreadInfo.id];
      if (realizedThreadInfo) {
        return realizedThreadInfo;
      }

      if (!loggedInUserInfo || !threadIsPending(baseThreadInfo.id)) {
        return baseThreadInfo;
      }
      const viewerID = loggedInUserInfo?.id;

      invariant(
        threadTypeCanBePending(baseThreadInfo.type),
        `ThreadInfo has pending ID ${baseThreadInfo.id}, but type that ` +
          `should not be pending ${baseThreadInfo.type}`,
      );

      const { searching, userInfoInputArray } = params;

      const { sourceMessageID } = baseThreadInfo;
      const pendingThreadID = searching
        ? getPendingThreadID(
            pendingThreadType(userInfoInputArray.length),
            [...userInfoInputArray.map(user => user.id), viewerID],
            sourceMessageID,
          )
        : getPendingThreadID(
            baseThreadInfo.type,
            baseThreadInfo.members.map(member => member.id),
            sourceMessageID,
          );

      const realizedThreadID = pendingToRealizedThreadIDs.get(pendingThreadID);
      if (realizedThreadID && threadInfos[realizedThreadID]) {
        return threadInfos[realizedThreadID];
      }

      const updatedThread = searching
        ? createPendingThread({
            viewerID,
            threadType: pendingThreadType(userInfoInputArray.length),
            members: [loggedInUserInfo, ...userInfoInputArray],
          })
        : baseThreadInfo;

      return {
        ...updatedThread,
        currentUser: getCurrentUser(updatedThread, viewerID, userInfos),
      };
    },
    [
      baseThreadInfo,
      threadInfos,
      loggedInUserInfo,
      pendingToRealizedThreadIDs,
      userInfos,
    ],
  );
}

type ThreadTypeParentRequirement = 'optional' | 'required' | 'disabled';

function getThreadTypeParentRequirement(
  threadType: ThreadType,
): ThreadTypeParentRequirement {
  if (
    threadType === threadTypes.COMMUNITY_OPEN_SUBTHREAD ||
    threadType === threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD ||
    //threadType === threadTypes.COMMUNITY_SECRET_SUBTHREAD ||
    threadType === threadTypes.COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD ||
    threadType === threadTypes.SIDEBAR
  ) {
    return 'required';
  } else if (
    threadType === threadTypes.COMMUNITY_ROOT ||
    threadType === threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT ||
    threadType === threadTypes.GENESIS ||
    threadType === threadTypes.PERSONAL ||
    threadType === threadTypes.PRIVATE
  ) {
    return 'disabled';
  } else {
    return 'optional';
  }
}

function threadMemberHasPermission(
  threadInfo: ThreadInfo,
  memberID: string,
  permission: ThreadPermission,
): boolean {
  for (const member of threadInfo.members) {
    if (member.id !== memberID) {
      continue;
    }
    return hasPermission(member.permissions, permission);
  }
  return false;
}

function checkIfDefaultMembersAreVoiced(threadInfo: ThreadInfo): boolean {
  const defaultRoleID = Object.keys(threadInfo.roles).find(roleID =>
    roleIsDefaultRole(threadInfo.roles[roleID]),
  );
  invariant(
    defaultRoleID !== undefined,
    'all threads should have a default role',
  );
  const defaultRole = threadInfo.roles[defaultRoleID];
  const defaultRolePermissions =
    decodeMinimallyEncodedRoleInfo(defaultRole).permissions;

  return !!defaultRolePermissions[threadPermissions.VOICED];
}

const draftKeySuffix = '/message_composer';

function draftKeyFromThreadID(threadID: string): string {
  return `${threadID}${draftKeySuffix}`;
}

function getContainingThreadID(
  parentThreadInfo:
    | ?ServerThreadInfo
    | LegacyRawThreadInfo
    | RawThreadInfo
    | ThreadInfo,
  threadType: ThreadType,
): ?string {
  if (!parentThreadInfo) {
    return null;
  }
  if (threadType === threadTypes.SIDEBAR) {
    return parentThreadInfo.id;
  }
  if (!parentThreadInfo.containingThreadID) {
    return parentThreadInfo.id;
  }
  return parentThreadInfo.containingThreadID;
}

function getCommunity(
  parentThreadInfo:
    | ?ServerThreadInfo
    | LegacyRawThreadInfo
    | RawThreadInfo
    | ThreadInfo,
): ?string {
  if (!parentThreadInfo) {
    return null;
  }
  const { id, community, type } = parentThreadInfo;
  if (community !== null && community !== undefined) {
    return community;
  }
  if (threadTypeIsCommunityRoot(type)) {
    return id;
  }
  return null;
}

function getThreadListSearchResults(
  chatListData: $ReadOnlyArray<ChatThreadItem>,
  searchText: string,
  threadFilter: ThreadInfo => boolean,
  threadSearchResults: $ReadOnlySet<string>,
  usersSearchResults: $ReadOnlyArray<GlobalAccountUserInfo>,
  loggedInUserInfo: ?LoggedInUserInfo,
): $ReadOnlyArray<ChatThreadItem> {
  if (!searchText) {
    return chatListData.filter(
      item =>
        threadIsTopLevel(item.threadInfo) && threadFilter(item.threadInfo),
    );
  }

  const privateThreads = [];
  const personalThreads = [];
  const otherThreads = [];
  for (const item of chatListData) {
    if (!threadSearchResults.has(item.threadInfo.id)) {
      continue;
    }
    if (item.threadInfo.type === threadTypes.PRIVATE) {
      privateThreads.push({ ...item, sidebars: [] });
    } else if (item.threadInfo.type === threadTypes.PERSONAL) {
      personalThreads.push({ ...item, sidebars: [] });
    } else {
      otherThreads.push({ ...item, sidebars: [] });
    }
  }

  const chatItems: ChatThreadItem[] = [
    ...privateThreads,
    ...personalThreads,
    ...otherThreads,
  ];
  if (loggedInUserInfo) {
    chatItems.push(
      ...usersSearchResults.map(user =>
        createPendingThreadItem(loggedInUserInfo, user),
      ),
    );
  }
  return chatItems;
}

function useAvailableThreadMemberActions(
  memberInfo: RelativeMemberInfo,
  threadInfo: ThreadInfo,
  canEdit: ?boolean = true,
): $ReadOnlyArray<'change_role' | 'remove_user'> {
  const canRemoveMembers = useThreadHasPermission(
    threadInfo,
    threadPermissions.REMOVE_MEMBERS,
  );
  const canChangeRoles = useThreadHasPermission(
    threadInfo,
    threadPermissions.CHANGE_ROLE,
  );

  return React.useMemo(() => {
    const { role } = memberInfo;
    if (!canEdit || !role) {
      return [];
    }

    const result = [];

    if (
      canChangeRoles &&
      memberInfo.username &&
      threadHasAdminRole(threadInfo)
    ) {
      result.push('change_role');
    }

    if (
      canRemoveMembers &&
      !memberInfo.isViewer &&
      (canChangeRoles || roleIsDefaultRole(threadInfo.roles[role]))
    ) {
      result.push('remove_user');
    }

    return result;
  }, [canChangeRoles, canEdit, canRemoveMembers, memberInfo, threadInfo]);
}

function patchThreadInfoToIncludeMentionedMembersOfParent(
  threadInfo: ThreadInfo,
  parentThreadInfo: ThreadInfo,
  messageText: string,
  viewerID: string,
): ThreadInfo {
  const members: UserIDAndUsername[] = threadInfo.members
    .map(({ id, username }) =>
      username ? ({ id, username }: UserIDAndUsername) : null,
    )
    .filter(Boolean);
  const mentionedNewMembers = extractNewMentionedParentMembers(
    messageText,
    threadInfo,
    parentThreadInfo,
  );
  if (mentionedNewMembers.length === 0) {
    return threadInfo;
  }
  members.push(...mentionedNewMembers);
  return createPendingThread({
    viewerID,
    threadType: threadTypes.SIDEBAR,
    members,
    parentThreadInfo,
    threadColor: threadInfo.color,
    name: threadInfo.name,
    sourceMessageID: threadInfo.sourceMessageID,
  });
}

function threadInfoInsideCommunity(
  threadInfo: RawThreadInfo | ThreadInfo,
  communityID: string,
): boolean {
  return threadInfo.community === communityID || threadInfo.id === communityID;
}

type RoleAndMemberCount = {
  [roleName: string]: number,
};

function useRoleMemberCountsForCommunity(
  threadInfo: ThreadInfo,
): RoleAndMemberCount {
  return React.useMemo(() => {
    const roleIDsToNames: { [string]: string } = {};

    Object.keys(threadInfo.roles).forEach(roleID => {
      roleIDsToNames[roleID] = threadInfo.roles[roleID].name;
    });

    const roleNamesToMemberCount: RoleAndMemberCount = {};

    threadInfo.members.forEach(({ role: roleID }) => {
      invariant(roleID, 'Community member should have a role');
      const roleName = roleIDsToNames[roleID];

      roleNamesToMemberCount[roleName] =
        (roleNamesToMemberCount[roleName] ?? 0) + 1;
    });

    // For all community roles with no members, add them to the list with 0
    Object.keys(roleIDsToNames).forEach(roleName => {
      if (roleNamesToMemberCount[roleIDsToNames[roleName]] === undefined) {
        roleNamesToMemberCount[roleIDsToNames[roleName]] = 0;
      }
    });

    return roleNamesToMemberCount;
  }, [threadInfo.members, threadInfo.roles]);
}

function useRoleNamesToSpecialRole(threadInfo: ThreadInfo): {
  +[roleName: string]: ?SpecialRole,
} {
  return React.useMemo(() => {
    const roleNamesToSpecialRole: { [roleName: string]: ?SpecialRole } = {};
    values(threadInfo.roles).forEach(role => {
      if (roleNamesToSpecialRole[role.name] !== undefined) {
        return;
      }
      if (roleIsDefaultRole(role)) {
        roleNamesToSpecialRole[role.name] = specialRoles.DEFAULT_ROLE;
      } else if (roleIsAdminRole(role)) {
        roleNamesToSpecialRole[role.name] = specialRoles.ADMIN_ROLE;
      } else {
        roleNamesToSpecialRole[role.name] = null;
      }
    });
    return roleNamesToSpecialRole;
  }, [threadInfo.roles]);
}

type RoleUserSurfacedPermissions = {
  +[roleName: string]: $ReadOnlySet<UserSurfacedPermission>,
};
// Iterates through the existing roles in the community and 'reverse maps'
// the set of permission literals for each role to user-facing permission enums
// to help pre-populate the permission checkboxes when editing roles.
function useRoleUserSurfacedPermissions(
  threadInfo: ThreadInfo,
): RoleUserSurfacedPermissions {
  return React.useMemo(() => {
    const roleNamesToPermissions: { [string]: Set<UserSurfacedPermission> } =
      {};

    Object.keys(threadInfo.roles).forEach(roleID => {
      const roleName = threadInfo.roles[roleID].name;
      const rolePermissions = Object.keys(
        decodeMinimallyEncodedRoleInfo(threadInfo.roles[roleID]).permissions,
      );

      const setOfUserSurfacedPermissions = new Set<UserSurfacedPermission>();

      rolePermissions.forEach(rolePermission => {
        const userSurfacedPermission = Object.keys(
          configurableCommunityPermissions,
        ).find(key =>
          configurableCommunityPermissions[key].has(rolePermission),
        );

        if (userSurfacedPermission) {
          setOfUserSurfacedPermissions.add(userSurfacedPermission);
        }
      });
      roleNamesToPermissions[roleName] = setOfUserSurfacedPermissions;
    });

    return roleNamesToPermissions;
  }, [threadInfo.roles]);
}

function communityOrThreadNoun(threadInfo: RawThreadInfo | ThreadInfo): string {
  return threadTypeIsCommunityRoot(threadInfo.type)
    ? 'community'
    : threadNoun(threadInfo.type, threadInfo.parentThreadID);
}

function getThreadsToDeleteText(
  threadInfo: RawThreadInfo | ThreadInfo,
): string {
  return `${
    threadTypeIsCommunityRoot(threadInfo.type)
      ? 'Subchannels and threads'
      : 'Threads'
  } within this ${communityOrThreadNoun(threadInfo)}`;
}

function useUserProfileThreadInfo(userInfo: ?UserInfo): ?UserProfileThreadInfo {
  const userID = userInfo?.id;
  const username = userInfo?.username;

  const loggedInUserInfo = useLoggedInUserInfo();
  const isViewerProfile = loggedInUserInfo?.id === userID;

  const privateThreadInfosSelector = threadInfosSelectorForThreadType(
    threadTypes.PRIVATE,
  );
  const privateThreadInfos = useSelector(privateThreadInfosSelector);

  const personalThreadInfosSelector = threadInfosSelectorForThreadType(
    threadTypes.PERSONAL,
  );

  const personalThreadInfos = useSelector(personalThreadInfosSelector);

  const usersWithPersonalThread = useSelector(usersWithPersonalThreadSelector);

  return React.useMemo(() => {
    if (!loggedInUserInfo || !userID || !username) {
      return null;
    }

    if (isViewerProfile) {
      const privateThreadInfo: ?ThreadInfo = privateThreadInfos[0];

      return privateThreadInfo ? { threadInfo: privateThreadInfo } : null;
    }

    if (usersWithPersonalThread.has(userID)) {
      const personalThreadInfo: ?ThreadInfo = personalThreadInfos.find(
        threadInfo =>
          userID === getSingleOtherUser(threadInfo, loggedInUserInfo.id),
      );

      return personalThreadInfo ? { threadInfo: personalThreadInfo } : null;
    }

    const pendingPersonalThreadInfo = createPendingPersonalThread(
      loggedInUserInfo,
      userID,
      username,
    );

    return pendingPersonalThreadInfo;
  }, [
    isViewerProfile,
    loggedInUserInfo,
    personalThreadInfos,
    privateThreadInfos,
    userID,
    username,
    usersWithPersonalThread,
  ]);
}

function assertAllThreadInfosAreLegacy(rawThreadInfos: MixedRawThreadInfos): {
  [id: string]: LegacyRawThreadInfo,
} {
  return Object.fromEntries(
    Object.entries(rawThreadInfos).map(([id, rawThreadInfo]) => {
      invariant(
        !rawThreadInfo.minimallyEncoded,
        `rawThreadInfos shouldn't be minimallyEncoded`,
      );
      return [id, rawThreadInfo];
    }),
  );
}

function useOnScreenEntryEditableThreadInfos(): $ReadOnlyArray<ThreadInfo> {
  const visibleThreadInfos = useSelector(onScreenThreadInfos);
  const editableVisibleThreadInfos = useThreadsWithPermission(
    visibleThreadInfos,
    threadPermissions.EDIT_ENTRIES,
  );
  return editableVisibleThreadInfos;
}

export {
  threadHasPermission,
  useCommunityRootMembersToRole,
  useThreadHasPermission,
  viewerIsMember,
  threadInChatList,
  useIsThreadInChatList,
  useThreadsInChatList,
  threadIsTopLevel,
  threadIsChannel,
  threadIsSidebar,
  threadInBackgroundChatList,
  threadInHomeChatList,
  threadIsInHome,
  threadInFilterList,
  userIsMember,
  threadActualMembers,
  threadOtherMembers,
  threadIsGroupChat,
  threadIsPending,
  threadIsPendingSidebar,
  getSingleOtherUser,
  getPendingThreadID,
  parsePendingThreadID,
  createPendingThread,
  extractNewMentionedParentMembers,
  pendingThreadType,
  filterOutDisabledPermissions,
  getCurrentUser,
  threadFrozenDueToBlock,
  threadFrozenDueToViewerBlock,
  rawThreadInfoFromServerThreadInfo,
  threadUIName,
  threadInfoFromRawThreadInfo,
  threadTypeDescriptions,
  memberHasAdminPowers,
  roleIsDefaultRole,
  roleIsAdminRole,
  threadHasAdminRole,
  identifyInvalidatedThreads,
  permissionsDisabledByBlock,
  emptyItemText,
  threadNoun,
  threadLabel,
  useExistingThreadInfoFinder,
  getThreadTypeParentRequirement,
  threadMemberHasPermission,
  checkIfDefaultMembersAreVoiced,
  draftKeySuffix,
  draftKeyFromThreadID,
  threadTypeCanBePending,
  getContainingThreadID,
  getCommunity,
  getThreadListSearchResults,
  useAvailableThreadMemberActions,
  threadMembersWithoutAddedAdmin,
  patchThreadInfoToIncludeMentionedMembersOfParent,
  threadInfoInsideCommunity,
  useRoleMemberCountsForCommunity,
  useRoleNamesToSpecialRole,
  useRoleUserSurfacedPermissions,
  getThreadsToDeleteText,
  useUserProfileThreadInfo,
  assertAllThreadInfosAreLegacy,
  useOnScreenEntryEditableThreadInfos,
  extractMentionedMembers,
};
