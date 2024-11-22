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
import { type UserSearchResult } from '../hooks/thread-search-hooks.js';
import { useUsersSupportThickThreads } from '../hooks/user-identities-hooks.js';
import { extractKeyserverIDFromIDOptional } from '../keyserver-conn/keyserver-call-utils.js';
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
import type {
  ChatThreadItem,
  SidebarItem,
} from '../selectors/chat-selectors.js';
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
import type { AuxUserInfos } from '../types/aux-user-types.js';
import type { RawDeviceList } from '../types/identity-service-types.js';
import type {
  RelativeMemberInfo,
  RawThreadInfo,
  MemberInfoWithPermissions,
  RoleInfo,
  ThreadInfo,
  MinimallyEncodedThickMemberInfo,
  ThinRawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import {
  decodeMinimallyEncodedRoleInfo,
  minimallyEncodeMemberInfo,
  minimallyEncodeRawThreadInfoWithMemberPermissions,
  minimallyEncodeRoleInfo,
  minimallyEncodeThreadCurrentUserInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { userRelationshipStatus } from '../types/relationship-types.js';
import { defaultThreadSubscription } from '../types/subscription-types.js';
import {
  threadPermissionPropagationPrefixes,
  threadPermissions,
  type ThreadPermission,
  type ThreadPermissionsInfo,
  type ThreadRolePermissionsBlob,
  type UserSurfacedPermission,
  threadPermissionFilterPrefixes,
  threadPermissionsDisabledByBlock,
  type ThreadPermissionNotAffectedByBlock,
} from '../types/thread-permission-types.js';
import {
  type ThreadType,
  threadTypes,
  threadTypeIsCommunityRoot,
  assertThreadType,
  threadTypeIsThick,
  assertThinThreadType,
  assertThickThreadType,
  threadTypeIsSidebar,
  threadTypeIsPrivate,
  threadTypeIsPersonal,
  type ThinThreadType,
} from '../types/thread-types-enum.js';
import type {
  LegacyRawThreadInfo,
  ClientLegacyRoleInfo,
  ServerThreadInfo,
  ThickMemberInfo,
  UserProfileThreadInfo,
  MixedRawThreadInfos,
  LegacyThinRawThreadInfo,
  ThreadTimestamps,
} from '../types/thread-types.js';
import { updateTypes } from '../types/update-types-enum.js';
import { type ClientUpdateInfo } from '../types/update-types.js';
import type {
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
import {
  stripMemberPermissionsFromRawThreadInfo,
  type ThinRawThreadInfoWithPermissions,
} from '../utils/member-info-utils.js';
import { entries, values } from '../utils/objects.js';
import { useSelector } from '../utils/redux-utils.js';
import { userSurfacedPermissionsFromRolePermissions } from '../utils/role-utils.js';
import { firstLine } from '../utils/string-utils.js';
import {
  pendingThreadIDRegex,
  pendingThickSidebarURLPrefix,
  pendingSidebarURLPrefix,
} from '../utils/validation-utils.js';

function threadHasPermission(
  threadInfo: ?(ThreadInfo | LegacyRawThreadInfo | RawThreadInfo),
  permission: ThreadPermissionNotAffectedByBlock,
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

    if (communityThreadInfos.length === 0) {
      return {};
    }

    const communityRoots = _keyBy('id')(communityThreadInfos);
    return _mapValues((threadInfo: ThreadInfo) => {
      const keyedMembers = _keyBy('id')(threadInfo.members);
      const keyedMembersToRole = _mapValues(
        (member: MemberInfoWithPermissions | RelativeMemberInfo) => {
          return member.role ? threadInfo.roles[member.role] : null;
        },
      )(keyedMembers);
      return keyedMembersToRole;
    })(communityRoots);
  }, [threadInfos]);

  return communityRootMembersToRole;
}

// This function returns true for all thick threads, as well as all channels
// inside GENESIS. Channels inside GENESIS were used in place of thick threads
// before thick threads were launched, and as such we mirror "freezing" behavior
// between them and thick threads. "Freezing" a thread can occur when a user
// blocks another user, and those two users are the only members of a given
// chat. Note that we exclude the GENESIS community root here, as the root
// itself has never been used in place of thick threads. Also note that
// grandchild channels of GENESIS get this behavior too, even though we don't
// currently support channels inside thick threads.
function threadIsThickOrChannelInsideGenesis(threadInfo: ThreadInfo): boolean {
  if (threadTypeIsThick(threadInfo.type)) {
    return true;
  }
  if (getCommunity(threadInfo) !== genesis().id) {
    return false;
  }
  return threadInfo.id !== genesis().id;
}

function useThreadsWithPermission(
  threadInfos: $ReadOnlyArray<ThreadInfo>,
  permission: ThreadPermission,
): $ReadOnlyArray<ThreadInfo> {
  const loggedInUserInfo = useLoggedInUserInfo();
  const userInfos = useSelector(state => state.userStore.userInfos);

  return React.useMemo(() => {
    return threadInfos.filter((threadInfo: ThreadInfo) => {
      const isGroupChat = threadIsThickOrChannelInsideGenesis(threadInfo);
      if (!isGroupChat || !loggedInUserInfo) {
        return hasPermission(threadInfo.currentUser.permissions, permission);
      }

      const threadFrozen = threadIsWithBlockedUserOnlyWithoutAdminRoleCheck(
        threadInfo,
        loggedInUserInfo.id,
        userInfos,
        false,
      );

      const permissions = threadFrozen
        ? filterOutDisabledPermissions(threadInfo.currentUser.permissions)
        : threadInfo.currentUser.permissions;

      return hasPermission(permissions, permission);
    });
  }, [threadInfos, loggedInUserInfo, userInfos, permission]);
}

function useThreadHasPermission(
  threadInfo: ?ThreadInfo,
  permission: ThreadPermission,
): boolean {
  const threadInfos = React.useMemo(
    () => (threadInfo ? [threadInfo] : []),
    [threadInfo],
  );
  const threads = useThreadsWithPermission(threadInfos, permission);
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

function isMemberActive(
  memberInfo: MemberInfoWithPermissions | MinimallyEncodedThickMemberInfo,
): boolean {
  const role = memberInfo.role;
  return role !== null && role !== undefined;
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
  return !!(threadInfo && !threadTypeIsSidebar(threadInfo.type));
}

function threadIsSidebar(threadInfo: ?(RawThreadInfo | ThreadInfo)): boolean {
  return !!(threadInfo && threadTypeIsSidebar(threadInfo.type));
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
    !threadTypeIsSidebar(threadInfo.type)
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
  memberInfos: $ReadOnlyArray<MemberInfoWithPermissions | RelativeMemberInfo>,
): $ReadOnlyArray<string> {
  return memberInfos
    .filter(memberInfo => memberInfo.role)
    .map(memberInfo => memberInfo.id);
}

type MemberIDAndRole = {
  +id: string,
  +role: ?string,
  ...
};
function threadOtherMembers<T: MemberIDAndRole>(
  memberInfos: $ReadOnlyArray<T>,
  viewerID: ?string,
): $ReadOnlyArray<T> {
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
  const adminID = extractKeyserverIDFromIDOptional(threadInfo.id);

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
  return (
    !!threadID?.startsWith(`pending/${pendingSidebarURLPrefix}/`) ||
    !!threadID?.startsWith(`pending/${pendingThickSidebarURLPrefix}`)
  );
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
  let pendingThreadKey;
  if (sourceMessageID && threadTypeIsThick(threadType)) {
    pendingThreadKey = `${pendingThickSidebarURLPrefix}/${sourceMessageID}`;
  } else if (sourceMessageID) {
    pendingThreadKey = `${pendingSidebarURLPrefix}/${sourceMessageID}`;
  } else {
    pendingThreadKey = [...memberIDs].sort().join('+');
  }

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
  let threadType;
  if (threadTypeString === pendingThickSidebarURLPrefix) {
    threadType = threadTypes.THICK_SIDEBAR;
  } else if (threadTypeString === pendingSidebarURLPrefix) {
    threadType = threadTypes.SIDEBAR;
  } else {
    threadType = assertThreadType(Number(threadTypeString.replace('type', '')));
  }

  const threadTypeStringIsSidebar =
    threadTypeString === pendingSidebarURLPrefix ||
    threadTypeString === pendingThickSidebarURLPrefix;
  const memberIDs = threadTypeStringIsSidebar ? [] : threadKey.split('+');
  const sourceMessageID = threadTypeStringIsSidebar ? threadKey : null;
  return {
    threadType,
    memberIDs,
    sourceMessageID,
  };
}

type UserIDAndUsername = {
  +id: string,
  +username: ?string,
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

  let rawThreadInfo: RawThreadInfo;
  if (threadTypeIsThick(threadType)) {
    const thickThreadType = assertThickThreadType(threadType);
    rawThreadInfo = {
      minimallyEncoded: true,
      thick: true,
      id: threadID,
      type: thickThreadType,
      name: name ?? null,
      description: null,
      color: threadColor ?? generatePendingThreadColor(memberIDs),
      creationTime: now,
      parentThreadID: parentThreadInfo?.id ?? null,
      containingThreadID: getContainingThreadID(
        parentThreadInfo,
        thickThreadType,
      ),
      members: members.map(member =>
        minimallyEncodeMemberInfo<ThickMemberInfo>({
          id: member.id,
          role: role.id,
          permissions: membershipPermissions,
          isSender: false,
          subscription: defaultThreadSubscription,
        }),
      ),
      roles: {
        [role.id]: role,
      },
      currentUser: minimallyEncodeThreadCurrentUserInfo({
        role: role.id,
        permissions: membershipPermissions,
        subscription: defaultThreadSubscription,
        unread: false,
      }),
      repliesCount: 0,
      sourceMessageID,
      pinnedCount: 0,
      timestamps: createThreadTimestamps(now, memberIDs),
    };
  } else {
    const thinThreadType = assertThinThreadType(threadType);
    rawThreadInfo = {
      minimallyEncoded: true,
      id: threadID,
      type: thinThreadType,
      name: name ?? null,
      description: null,
      color: threadColor ?? generatePendingThreadColor(memberIDs),
      creationTime: now,
      parentThreadID: parentThreadInfo?.id ?? null,
      containingThreadID: getContainingThreadID(
        parentThreadInfo,
        thinThreadType,
      ),
      community: getCommunity(parentThreadInfo),
      members: members.map(member => ({
        id: member.id,
        role: role.id,
        minimallyEncoded: true,
        isSender: false,
      })),
      roles: {
        [role.id]: role,
      },
      currentUser: minimallyEncodeThreadCurrentUserInfo({
        role: role.id,
        permissions: membershipPermissions,
        subscription: defaultThreadSubscription,
        unread: false,
      }),
      repliesCount: 0,
      sourceMessageID,
      pinnedCount: 0,
    };
  }

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

function createPendingPersonalOrPrivateThread(
  loggedInUserInfo: LoggedInUserInfo,
  userID: string,
  username: ?string,
  supportThickThreads: boolean,
): PendingPersonalThread {
  const pendingPersonalThreadUserInfo = {
    id: userID,
    username: username,
  };

  const members: Array<UserIDAndUsername> = [loggedInUserInfo];
  let threadType;
  if (loggedInUserInfo.id === userID) {
    threadType = supportThickThreads
      ? threadTypes.PRIVATE
      : threadTypes.GENESIS_PRIVATE;
  } else {
    threadType = supportThickThreads
      ? threadTypes.PERSONAL
      : threadTypes.GENESIS_PERSONAL;
    members.push(pendingPersonalThreadUserInfo);
  }

  const threadInfo = createPendingThread({
    viewerID: loggedInUserInfo.id,
    threadType,
    members,
  });

  return { threadInfo, pendingPersonalThreadUserInfo };
}

function createPendingThreadItem(
  loggedInUserInfo: LoggedInUserInfo,
  user: UserIDAndUsername,
  supportThickThreads: boolean,
): ChatThreadItem {
  const { threadInfo, pendingPersonalThreadUserInfo } =
    createPendingPersonalOrPrivateThread(
      loggedInUserInfo,
      user.id,
      user.username,
      supportThickThreads,
    );

  return {
    type: 'chatThreadItem',
    threadInfo,
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

function pendingThreadType(
  numberOfOtherMembers: number,
  thickOrThin: 'thick' | 'thin',
): 4 | 6 | 7 | 13 | 14 | 15 {
  if (thickOrThin === 'thick') {
    if (numberOfOtherMembers === 0) {
      return threadTypes.PRIVATE;
    } else if (numberOfOtherMembers === 1) {
      return threadTypes.PERSONAL;
    } else {
      return threadTypes.LOCAL;
    }
  } else {
    if (numberOfOtherMembers === 0) {
      return threadTypes.GENESIS_PRIVATE;
    } else if (numberOfOtherMembers === 1) {
      return threadTypes.GENESIS_PERSONAL;
    } else {
      return threadTypes.COMMUNITY_SECRET_SUBTHREAD;
    }
  }
}

function threadTypeCanBePending(threadType: ThreadType): boolean {
  return (
    threadType === threadTypes.GENESIS_PERSONAL ||
    threadType === threadTypes.COMMUNITY_SECRET_SUBTHREAD ||
    threadType === threadTypes.SIDEBAR ||
    threadType === threadTypes.GENESIS_PRIVATE ||
    threadType === threadTypes.PERSONAL ||
    threadType === threadTypes.LOCAL ||
    threadType === threadTypes.THICK_SIDEBAR ||
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
  +allowAddingUsersToCommunityRoot?: boolean,
  +filterManageFarcasterChannelTagsPermission?: boolean,
  +stripMemberPermissions?: boolean,
  +canDisplayFarcasterThreadAvatars?: boolean,
  +dontFilterMissingKnowOf?: boolean,
};

function rawThreadInfoFromServerThreadInfo(
  serverThreadInfo: ServerThreadInfo,
  viewerID: string,
  options?: RawThreadInfoOptions,
): ?LegacyThinRawThreadInfo | ?ThinRawThreadInfo {
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
  const allowAddingUsersToCommunityRoot =
    options?.allowAddingUsersToCommunityRoot;
  const filterManageFarcasterChannelTagsPermission =
    options?.filterManageFarcasterChannelTagsPermission;
  const stripMemberPermissions = options?.stripMemberPermissions;
  const canDisplayFarcasterThreadAvatars =
    options?.canDisplayFarcasterThreadAvatars;
  const dontFilterMissingKnowOf = options?.dontFilterMissingKnowOf ?? false;

  const filterThreadPermissions = (
    innerThreadPermissions: ThreadPermissionsInfo,
  ) => {
    if (
      allowAddingUsersToCommunityRoot &&
      (serverThreadInfo.type === threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT ||
        serverThreadInfo.type === threadTypes.COMMUNITY_ROOT)
    ) {
      innerThreadPermissions = {
        ...innerThreadPermissions,
        [threadPermissions.ADD_MEMBERS]: {
          value: true,
          source: serverThreadInfo.id,
        },
      };
    }
    return _omitBy(
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
          ].includes(k)) ||
        (filterManageFarcasterChannelTagsPermission &&
          [threadPermissions.MANAGE_FARCASTER_CHANNEL_TAGS].includes(k)),
    )(innerThreadPermissions);
  };

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
      subscription: defaultThreadSubscription,
      unread: null,
    };
  }
  if (
    !dontFilterMissingKnowOf &&
    !permissionLookup(currentUserPermissions, threadPermissions.KNOW_OF)
  ) {
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
    const avatar =
      serverThreadInfo.avatar.type === 'farcaster' &&
      !canDisplayFarcasterThreadAvatars
        ? null
        : serverThreadInfo.avatar;
    rawThreadInfo = { ...rawThreadInfo, avatar };
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

  const minimallyEncodedRawThreadInfoWithMemberPermissions =
    minimallyEncodeRawThreadInfoWithMemberPermissions(rawThreadInfo);
  invariant(
    !minimallyEncodedRawThreadInfoWithMemberPermissions.thick,
    'ServerThreadInfo should be thin thread',
  );

  if (!shouldIncludeSpecialRoleFieldInRoles) {
    const minimallyEncodedRolesWithoutSpecialRoleField = Object.fromEntries(
      entries(minimallyEncodedRawThreadInfoWithMemberPermissions.roles).map(
        ([key, role]) => [
          key,
          {
            ..._omit('specialRole')(role),
            isDefault: roleIsDefaultRole(role),
          },
        ],
      ),
    );
    return {
      ...minimallyEncodedRawThreadInfoWithMemberPermissions,
      roles: minimallyEncodedRolesWithoutSpecialRoleField,
    };
  }

  if (!stripMemberPermissions) {
    return minimallyEncodedRawThreadInfoWithMemberPermissions;
  }

  // The return value of `deprecatedMinimallyEncodeRawThreadInfo` is typed
  // as `RawThreadInfo`, but still includes thread member permissions.
  // This was to prevent introducing "Legacy" types that would need to be
  // maintained going forward. This `any`-cast allows us to more precisely
  // type the obj being passed to `stripMemberPermissionsFromRawThreadInfo`.
  const rawThreadInfoWithMemberPermissions: ThinRawThreadInfoWithPermissions =
    (minimallyEncodedRawThreadInfoWithMemberPermissions: any);

  return stripMemberPermissionsFromRawThreadInfo(
    rawThreadInfoWithMemberPermissions,
  );
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
    ifJustViewer: threadTypeIsPrivate(threadInfo.type)
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
    currentUser: rawThreadInfo.currentUser,
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
    threadTypeIsPrivate(rawThreadInfo.type) ||
    threadTypeIsPersonal(rawThreadInfo.type)
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

function baseThreadIsWithBlockedUserOnly(
  threadInfo: LegacyRawThreadInfo | RawThreadInfo | ThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
  checkOnlyViewerBlock: boolean,
) {
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

function threadIsWithBlockedUserOnlyWithoutAdminRoleCheck(
  threadInfo: ThreadInfo | RawThreadInfo | LegacyRawThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
  checkOnlyViewerBlock: boolean,
): boolean {
  if (threadOrParentThreadIsGroupChat(threadInfo)) {
    return false;
  }
  return baseThreadIsWithBlockedUserOnly(
    threadInfo,
    viewerID,
    userInfos,
    checkOnlyViewerBlock,
  );
}

function useThreadFrozenDueToViewerBlock(
  threadInfo: ThreadInfo,
  communityThreadInfo: ?ThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
): boolean {
  const communityThreadInfoArray = React.useMemo(
    () => (communityThreadInfo ? [communityThreadInfo] : []),
    [communityThreadInfo],
  );
  const communityRootsMembersToRole = useCommunityRootMembersToRole(
    communityThreadInfoArray,
  );
  const memberToRole = communityRootsMembersToRole[communityThreadInfo?.id];

  const memberHasAdminRole = threadMembersWithoutAddedAdmin(threadInfo).some(
    m => roleIsAdminRole(memberToRole?.[m.id]),
  );

  return React.useMemo(() => {
    if (memberHasAdminRole) {
      return false;
    }

    return threadIsWithBlockedUserOnlyWithoutAdminRoleCheck(
      threadInfo,
      viewerID,
      userInfos,
      true,
    );
  }, [memberHasAdminRole, threadInfo, userInfos, viewerID]);
}

const threadTypeDescriptions: { [ThreadType]: string } = {
  [threadTypes.COMMUNITY_OPEN_SUBTHREAD]:
    'Anybody in the parent channel can see an open subchannel.',
  [threadTypes.COMMUNITY_SECRET_SUBTHREAD]:
    'Only visible to its members and admins of ancestor channels.',
};

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
  `Muted chats are just like normal chats, except they don't ` +
  `contribute to your unread count.\n\n` +
  `To move a chat over here, switch the “Muted” option in its settings.`;

function threadNoun(threadType: ThreadType, parentThreadID: ?string): string {
  if (threadTypeIsSidebar(threadType)) {
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
  } else if (threadType === threadTypes.GENESIS_PERSONAL) {
    return 'Personal';
  } else if (threadTypeIsSidebar(threadType)) {
    return 'Thread';
  } else if (threadType === threadTypes.GENESIS_PRIVATE) {
    return 'Private';
  } else if (
    threadType === threadTypes.COMMUNITY_ROOT ||
    threadType === threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT ||
    threadType === threadTypes.GENESIS
  ) {
    return 'Community';
  } else if (threadTypeIsThick(threadType)) {
    return 'Local DM';
  } else {
    return 'Secret';
  }
}

type ExistingThreadInfoFinderParams = {
  +searching: boolean,
  +userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
  +allUsersSupportThickThreads: boolean,
};
type ExistingThreadInfoFinder = (
  params: ExistingThreadInfoFinderParams,
) => ?ThreadInfo;

function useExistingThreadInfoFinder(
  baseThreadInfo: ?ThreadInfo,
): ExistingThreadInfoFinder {
  const threadInfos = useSelector(threadInfoSelector);
  const loggedInUserInfo = useLoggedInUserInfo();

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

      let pendingThreadID;
      if (searching) {
        pendingThreadID = getPendingThreadID(
          pendingThreadType(userInfoInputArray.length, 'thick'),
          [...userInfoInputArray.map(user => user.id), viewerID],
          sourceMessageID,
        );
      } else {
        pendingThreadID = getPendingThreadID(
          baseThreadInfo.type,
          baseThreadInfo.members.map(member => member.id),
          sourceMessageID,
        );
      }
      const realizedThreadID = pendingToRealizedThreadIDs.get(pendingThreadID);
      if (realizedThreadID && threadInfos[realizedThreadID]) {
        return threadInfos[realizedThreadID];
      }

      if (!searching) {
        return baseThreadInfo;
      }

      return createPendingThread({
        viewerID,
        threadType: pendingThreadType(
          userInfoInputArray.length,
          params.allUsersSupportThickThreads ? 'thick' : 'thin',
        ),
        members: [
          { ...loggedInUserInfo, isViewer: true },
          ...userInfoInputArray,
        ],
      });
    },
    [baseThreadInfo, threadInfos, loggedInUserInfo, pendingToRealizedThreadIDs],
  );
}

type ThreadTypeParentRequirement = 'optional' | 'required' | 'disabled';

function getThreadTypeParentRequirement(
  threadType: ThinThreadType,
): ThreadTypeParentRequirement {
  if (
    threadType === threadTypes.COMMUNITY_OPEN_SUBTHREAD ||
    threadType === threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD ||
    //threadType === threadTypes.COMMUNITY_SECRET_SUBTHREAD ||
    threadType === threadTypes.COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD ||
    threadTypeIsSidebar(threadType)
  ) {
    return 'required';
  } else if (
    threadType === threadTypes.COMMUNITY_ROOT ||
    threadType === threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT ||
    threadType === threadTypes.GENESIS ||
    threadType === threadTypes.GENESIS_PERSONAL ||
    threadType === threadTypes.GENESIS_PRIVATE
  ) {
    return 'disabled';
  } else {
    return 'optional';
  }
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
  if (threadTypeIsSidebar(threadType)) {
    return parentThreadInfo.id;
  }
  if (!parentThreadInfo.containingThreadID) {
    return parentThreadInfo.id;
  }
  return parentThreadInfo.containingThreadID;
}

function getCommunity(
  threadInfo:
    | ?ServerThreadInfo
    | LegacyRawThreadInfo
    | RawThreadInfo
    | ThreadInfo,
): ?string {
  if (!threadInfo) {
    return null;
  }
  const { id, community, type } = threadInfo;
  if (community !== null && community !== undefined) {
    return community;
  }
  if (threadTypeIsCommunityRoot(type)) {
    return id;
  }
  return null;
}

function getSearchResultsForEmptySearchText(
  chatListData: $ReadOnlyArray<ChatThreadItem>,
  threadFilter: ThreadInfo => boolean,
): Array<ChatThreadItem> {
  const threadHomeSubscriptions = Object.fromEntries(
    chatListData.map(chatThreadItem => [
      chatThreadItem.threadInfo.id,
      threadIsInHome(chatThreadItem.threadInfo),
    ]),
  );

  return chatListData
    .filter((item: ChatThreadItem) => {
      const { threadInfo } = item;
      const { parentThreadID } = threadInfo;
      const isInFilteredChatList =
        threadInChatList(threadInfo) && threadFilter(threadInfo);

      if (!isInFilteredChatList) {
        return false;
      }
      if (!threadIsSidebar(threadInfo) || !parentThreadID) {
        return true;
      }
      const isParentInHome = threadHomeSubscriptions[parentThreadID];
      const isThreadInHome = threadIsInHome(threadInfo);

      return isParentInHome !== isThreadInHome;
    })
    .map((item: ChatThreadItem) => {
      if (threadIsSidebar(item.threadInfo)) {
        return item;
      }
      const sidebarsOnlyInSameTab = item.sidebars.filter(
        (sidebar: SidebarItem) =>
          sidebar.type !== 'sidebar' ||
          threadIsInHome(sidebar.threadInfo) ===
            threadIsInHome(item.threadInfo),
      );
      if (sidebarsOnlyInSameTab.length === item.sidebars.length) {
        return item;
      }
      return {
        ...item,
        sidebars: sidebarsOnlyInSameTab,
      };
    });
}

function getThreadListSearchResults(
  chatListData: $ReadOnlyArray<ChatThreadItem>,
  searchText: string,
  threadFilter: ThreadInfo => boolean,
  threadSearchResults: $ReadOnlySet<string>,
  usersSearchResults: $ReadOnlyArray<UserSearchResult>,
  loggedInUserInfo: ?LoggedInUserInfo,
): $ReadOnlyArray<ChatThreadItem> {
  if (!searchText) {
    return getSearchResultsForEmptySearchText(chatListData, threadFilter);
  }

  const privateThreads = [];
  const personalThreads = [];
  const otherThreads = [];
  for (const item of chatListData) {
    if (!threadSearchResults.has(item.threadInfo.id)) {
      continue;
    }
    if (threadTypeIsPrivate(item.threadInfo.type)) {
      privateThreads.push({ ...item, sidebars: [] });
    } else if (threadTypeIsPersonal(item.threadInfo.type)) {
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
        createPendingThreadItem(
          loggedInUserInfo,
          user,
          user.supportThickThreads,
        ),
      ),
    );
  }
  return chatItems;
}

function reorderThreadSearchResults<T: RawThreadInfo | ThreadInfo>(
  threadInfos: $ReadOnlyArray<T>,
  threadSearchResults: $ReadOnlyArray<string>,
): T[] {
  const privateThreads = [];
  const personalThreads = [];
  const otherThreads = [];
  const threadSearchResultsSet = new Set(threadSearchResults);
  for (const threadInfo of threadInfos) {
    if (!threadSearchResultsSet.has(threadInfo.id)) {
      continue;
    }
    if (threadTypeIsPrivate(threadInfo.type)) {
      privateThreads.push(threadInfo);
    } else if (threadTypeIsPersonal(threadInfo.type)) {
      personalThreads.push(threadInfo);
    } else {
      otherThreads.push(threadInfo);
    }
  }

  return [...privateThreads, ...personalThreads, ...otherThreads];
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
  const threadType = threadTypeIsThick(parentThreadInfo.type)
    ? threadTypes.THICK_SIDEBAR
    : threadTypes.SIDEBAR;

  return createPendingThread({
    viewerID,
    threadType,
    members,
    parentThreadInfo,
    threadColor: threadInfo.color,
    name: threadInfo.name,
    sourceMessageID: threadInfo.sourceMessageID,
  });
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
      const rolePermissions = decodeMinimallyEncodedRoleInfo(
        threadInfo.roles[roleID],
      ).permissions;
      roleNamesToPermissions[roleName] =
        userSurfacedPermissionsFromRolePermissions(rolePermissions);
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

type OldestCreatedInput = { +creationTime: number, ... };
function getOldestCreated<T: OldestCreatedInput>(arr: $ReadOnlyArray<T>): ?T {
  return arr.reduce<?T>(
    (a, b) => (!b || (a && a.creationTime < b.creationTime) ? a : b),
    null,
  );
}

function useOldestPrivateThreadInfo(): ?ThreadInfo {
  const genesisPrivateThreadInfosSelector = threadInfosSelectorForThreadType(
    threadTypes.GENESIS_PRIVATE,
  );
  const genesisPrivateThreadInfos = useSelector(
    genesisPrivateThreadInfosSelector,
  );
  const privateThreadInfosSelector = threadInfosSelectorForThreadType(
    threadTypes.PRIVATE,
  );
  const privateThreadInfos = useSelector(privateThreadInfosSelector);
  return React.useMemo(
    () =>
      getOldestCreated([...privateThreadInfos, ...genesisPrivateThreadInfos]),
    [privateThreadInfos, genesisPrivateThreadInfos],
  );
}

function useUserProfileThreadInfo(userInfo: ?UserInfo): ?UserProfileThreadInfo {
  const userID = userInfo?.id;
  const username = userInfo?.username;

  const loggedInUserInfo = useLoggedInUserInfo();
  const isViewerProfile = loggedInUserInfo?.id === userID;

  const oldestPrivateThreadInfo = useOldestPrivateThreadInfo();

  const usersWithPersonalThread = useSelector(usersWithPersonalThreadSelector);
  const genesisPersonalThreadInfosSelector = threadInfosSelectorForThreadType(
    threadTypes.GENESIS_PERSONAL,
  );
  const genesisPersonalThreadInfos = useSelector(
    genesisPersonalThreadInfosSelector,
  );
  const personalThreadInfosSelector = threadInfosSelectorForThreadType(
    threadTypes.PERSONAL,
  );
  const personalThreadInfos = useSelector(personalThreadInfosSelector);
  const allPersonalThreadInfos = React.useMemo(
    () => [...personalThreadInfos, ...genesisPersonalThreadInfos],
    [personalThreadInfos, genesisPersonalThreadInfos],
  );

  const [supportThickThreads, setSupportThickThreads] = React.useState(false);
  const usersSupportThickThreads = useUsersSupportThickThreads();

  React.useEffect(() => {
    void (async () => {
      if (!userInfo) {
        setSupportThickThreads(false);
        return;
      }
      const result = await usersSupportThickThreads([userInfo.id]);
      setSupportThickThreads(!!result.get(userInfo.id));
    })();
  }, [userInfo, usersSupportThickThreads]);

  return React.useMemo(() => {
    if (!loggedInUserInfo || !userID || !username) {
      return null;
    }

    if (isViewerProfile && oldestPrivateThreadInfo) {
      return { threadInfo: oldestPrivateThreadInfo };
    }

    if (usersWithPersonalThread.has(userID)) {
      const personalThreadInfo: ?ThreadInfo = getOldestCreated(
        allPersonalThreadInfos.filter(
          threadInfo =>
            userID === getSingleOtherUser(threadInfo, loggedInUserInfo.id),
        ),
      );
      return personalThreadInfo ? { threadInfo: personalThreadInfo } : null;
    }

    const pendingPersonalThreadInfo = createPendingPersonalOrPrivateThread(
      loggedInUserInfo,
      userID,
      username,
      supportThickThreads,
    );

    return pendingPersonalThreadInfo;
  }, [
    isViewerProfile,
    loggedInUserInfo,
    allPersonalThreadInfos,
    oldestPrivateThreadInfo,
    supportThickThreads,
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

function createThreadTimestamps(
  timestamp: number,
  memberIDs: $ReadOnlyArray<string>,
): ThreadTimestamps {
  return {
    name: timestamp,
    avatar: timestamp,
    description: timestamp,
    color: timestamp,
    members: Object.fromEntries(
      memberIDs.map(id => [
        id,
        { isMember: timestamp, subscription: timestamp },
      ]),
    ),
    currentUser: {
      unread: timestamp,
    },
  };
}

function userHasDeviceList(
  userID: string,
  auxUserInfos: AuxUserInfos,
): boolean {
  return deviceListIsNonEmpty(auxUserInfos[userID]?.deviceList);
}

function deviceListIsNonEmpty(deviceList?: RawDeviceList): boolean {
  return !!deviceList && deviceList.devices.length > 0;
}

const deviceListRequestTimeout = 20 * 1000; // twenty seconds
const expectedAccountDeletionUpdateTimeout = 24 * 60 * 60 * 1000; // one day

function deviceListCanBeRequestedForUser(
  userID: string,
  auxUserInfos: AuxUserInfos,
): boolean {
  return (
    !auxUserInfos[userID]?.accountMissingStatus ||
    auxUserInfos[userID].accountMissingStatus.lastChecked <
      Date.now() - deviceListRequestTimeout
  );
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
  useThreadFrozenDueToViewerBlock,
  rawThreadInfoFromServerThreadInfo,
  threadUIName,
  threadInfoFromRawThreadInfo,
  threadTypeDescriptions,
  threadIsWithBlockedUserOnlyWithoutAdminRoleCheck,
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
  checkIfDefaultMembersAreVoiced,
  draftKeySuffix,
  draftKeyFromThreadID,
  threadTypeCanBePending,
  getContainingThreadID,
  getCommunity,
  getThreadListSearchResults,
  reorderThreadSearchResults,
  useAvailableThreadMemberActions,
  threadMembersWithoutAddedAdmin,
  patchThreadInfoToIncludeMentionedMembersOfParent,
  useRoleMemberCountsForCommunity,
  useRoleNamesToSpecialRole,
  useRoleUserSurfacedPermissions,
  getThreadsToDeleteText,
  useOldestPrivateThreadInfo,
  useUserProfileThreadInfo,
  assertAllThreadInfosAreLegacy,
  useOnScreenEntryEditableThreadInfos,
  extractMentionedMembers,
  isMemberActive,
  createThreadTimestamps,
  userHasDeviceList,
  deviceListIsNonEmpty,
  deviceListCanBeRequestedForUser,
  expectedAccountDeletionUpdateTimeout,
};
