// @flow

import invariant from 'invariant';
import _find from 'lodash/fp/find.js';
import * as React from 'react';
import stringHash from 'string-hash';
import tinycolor from 'tinycolor2';

import { type ParserRules } from './markdown.js';
import { getMessageTitle } from './message-utils.js';
import { relationshipBlockedInEitherDirection } from './relationship-utils.js';
import threadWatcher from './thread-watcher.js';
import {
  fetchMostRecentMessagesActionTypes,
  fetchMostRecentMessages,
} from '../actions/message-actions.js';
import {
  changeThreadMemberRolesActionTypes,
  newThreadActionTypes,
  removeUsersFromThreadActionTypes,
} from '../actions/thread-actions.js';
import { searchUsers as searchUserCall } from '../actions/user-actions.js';
import ashoat from '../facts/ashoat.js';
import genesis from '../facts/genesis.js';
import {
  permissionLookup,
  getAllThreadPermissions,
  makePermissionsBlob,
} from '../permissions/thread-permissions.js';
import type {
  ChatThreadItem,
  ChatMessageInfoItem,
} from '../selectors/chat-selectors.js';
import { useGlobalThreadSearchIndex } from '../selectors/nav-selectors.js';
import {
  threadInfoSelector,
  pendingToRealizedThreadIDsSelector,
} from '../selectors/thread-selectors.js';
import {
  getRelativeMemberInfos,
  usersWithPersonalThreadSelector,
} from '../selectors/user-selectors.js';
import type { CalendarQuery } from '../types/entry-types.js';
import type {
  RobotextMessageInfo,
  ComposableMessageInfo,
} from '../types/message-types.js';
import { userRelationshipStatus } from '../types/relationship-types.js';
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
  type ThreadType,
  type ClientNewThreadRequest,
  type NewThreadResult,
  type ChangeThreadSettingsPayload,
  threadTypes,
  threadPermissions,
  threadTypeIsCommunityRoot,
  assertThreadType,
} from '../types/thread-types.js';
import { type ClientUpdateInfo, updateTypes } from '../types/update-types.js';
import type {
  GlobalAccountUserInfo,
  UserInfos,
  UserInfo,
  AccountUserInfo,
  LoggedInUserInfo,
} from '../types/user-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from '../utils/action-utils.js';
import type { DispatchActionPromise } from '../utils/action-utils.js';
import type { GetENSNames } from '../utils/ens-helpers.js';
import {
  ET,
  entityTextToRawString,
  getEntityTextAsString,
  type ThreadEntity,
} from '../utils/entity-text.js';
import { values } from '../utils/objects.js';
import { useSelector } from '../utils/redux-utils.js';
import { firstLine } from '../utils/string-utils.js';
import { trimText } from '../utils/text-utils.js';

const chatNameMaxLength = 191;
const chatNameMinLength = 0;
const secondCharRange = `{${chatNameMinLength},${chatNameMaxLength}}`;
const validChatNameRegexString = `^.${secondCharRange}$`;
const validChatNameRegex: RegExp = new RegExp(validChatNameRegexString);

function colorIsDark(color: string): boolean {
  return tinycolor(`#${color}`).isDark();
}

const selectedThreadColorsObj = Object.freeze({
  a: '4b87aa',
  b: '5c9f5f',
  c: 'b8753d',
  d: 'aa4b4b',
  e: '6d49ab',
  f: 'c85000',
  g: '008f83',
  h: '648caa',
  i: '57697f',
  j: '575757',
});

const selectedThreadColors: $ReadOnlyArray<string> = values(
  selectedThreadColorsObj,
);
export type SelectedThreadColors = $Values<typeof selectedThreadColorsObj>;

function generateRandomColor(): string {
  return selectedThreadColors[
    Math.floor(Math.random() * selectedThreadColors.length)
  ];
}

function generatePendingThreadColor(userIDs: $ReadOnlyArray<string>): string {
  const ids = [...userIDs].sort().join('#');
  const colorIdx = stringHash(ids) % selectedThreadColors.length;
  return selectedThreadColors[colorIdx];
}

function threadHasPermission(
  threadInfo: ?(ThreadInfo | RawThreadInfo),
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
  if (!threadInfo.currentUser.permissions[permission]) {
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
  return threadInChatList(threadInfo) && threadIsChannel(threadInfo);
}

function threadIsChannel(threadInfo: ?(ThreadInfo | RawThreadInfo)): boolean {
  return !!(threadInfo && threadInfo.type !== threadTypes.SIDEBAR);
}

function threadIsSidebar(threadInfo: ?(ThreadInfo | RawThreadInfo)): boolean {
  return threadInfo?.type === threadTypes.SIDEBAR;
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
  if (threadInfo.id === genesis.id) {
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

function threadOtherMembers<T: MemberInfo | RelativeMemberInfo>(
  memberInfos: $ReadOnlyArray<T>,
  viewerID: ?string,
): $ReadOnlyArray<T> {
  return memberInfos.filter(
    memberInfo => memberInfo.role && memberInfo.id !== viewerID,
  );
}

function threadMembersWithoutAddedAshoat<T: ThreadInfo | RawThreadInfo>(
  threadInfo: T,
): $PropertyType<T, 'members'> {
  if (threadInfo.community !== genesis.id) {
    return threadInfo.members;
  }
  return threadInfo.members.filter(
    member => member.id !== ashoat.id || member.role,
  );
}

function threadIsGroupChat(threadInfo: ThreadInfo | RawThreadInfo): boolean {
  return (
    threadMembersWithoutAddedAshoat(threadInfo).filter(
      member =>
        member.role || member.permissions[threadPermissions.VOICED]?.value,
    ).length > 2
  );
}

function threadOrParentThreadIsGroupChat(
  threadInfo: RawThreadInfo | ThreadInfo,
) {
  return threadMembersWithoutAddedAshoat(threadInfo).length > 2;
}

function threadIsPending(threadID: ?string): boolean {
  return !!threadID?.startsWith('pending');
}

function getSingleOtherUser(
  threadInfo: ThreadInfo | RawThreadInfo,
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

const pendingThreadIDRegex =
  'pending/(type[0-9]+/[0-9]+(\\+[0-9]+)*|sidebar/[0-9]+)';

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

type CreatePendingThreadArgs = {
  +viewerID: string,
  +threadType: ThreadType,
  +members?: $ReadOnlyArray<GlobalAccountUserInfo | UserInfo>,
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
  const nonViewerMembers = members
    ? members.filter(member => member.id !== viewerID)
    : [];
  const nonViewerMemberIDs = nonViewerMembers.map(member => member.id);
  const memberIDs = [...nonViewerMemberIDs, viewerID];
  const threadID = getPendingThreadID(threadType, memberIDs, sourceMessageID);

  const permissions = {
    [threadPermissions.KNOW_OF]: true,
    [threadPermissions.VISIBLE]: true,
    [threadPermissions.VOICED]: true,
  };

  const membershipPermissions = getAllThreadPermissions(
    makePermissionsBlob(permissions, null, threadID, threadType),
    threadID,
  );
  const role = {
    id: `${threadID}/role`,
    name: 'Members',
    permissions,
    isDefault: true,
  };

  const rawThreadInfo = {
    id: threadID,
    type: threadType,
    name: name ?? null,
    description: null,
    color: threadColor ?? generatePendingThreadColor(memberIDs),
    creationTime: now,
    parentThreadID: parentThreadInfo?.id ?? null,
    containingThreadID: getContainingThreadID(parentThreadInfo, threadType),
    community: getCommunity(parentThreadInfo),
    members: [
      {
        id: viewerID,
        role: role.id,
        permissions: membershipPermissions,
        isSender: false,
      },
      ...nonViewerMembers.map(member => ({
        id: member.id,
        role: role.id,
        permissions: membershipPermissions,
        isSender: false,
      })),
    ],
    roles: {
      [role.id]: role,
    },
    currentUser: {
      role: role.id,
      permissions: membershipPermissions,
      subscription: {
        pushNotifs: false,
        home: false,
      },
      unread: false,
    },
    repliesCount: 0,
    sourceMessageID,
  };

  const userInfos = {};
  nonViewerMembers.forEach(member => (userInfos[member.id] = member));

  return threadInfoFromRawThreadInfo(rawThreadInfo, viewerID, userInfos);
}

function createPendingThreadItem(
  loggedInUserInfo: LoggedInUserInfo,
  user: GlobalAccountUserInfo,
): ChatThreadItem {
  const threadInfo = createPendingThread({
    viewerID: loggedInUserInfo.id,
    threadType: threadTypes.PERSONAL,
    members: [user],
  });

  return {
    type: 'chatThreadItem',
    threadInfo,
    mostRecentMessageInfo: null,
    mostRecentNonLocalMessage: null,
    lastUpdatedTime: threadInfo.creationTime,
    lastUpdatedTimeIncludingSidebars: threadInfo.creationTime,
    sidebars: [],
    pendingPersonalThreadUserInfo: {
      id: user.id,
      username: user.username,
    },
  };
}

type SharedCreatePendingSidebarInput = {
  +sourceMessageInfo: ComposableMessageInfo | RobotextMessageInfo,
  +parentThreadInfo: ThreadInfo,
  +viewerID: string,
};

type BaseCreatePendingSidebarInput = {
  ...SharedCreatePendingSidebarInput,
  +messageTitle: string,
};
function baseCreatePendingSidebar(
  input: BaseCreatePendingSidebarInput,
): ThreadInfo {
  const { sourceMessageInfo, parentThreadInfo, viewerID, messageTitle } = input;
  const { color, type: parentThreadType } = parentThreadInfo;
  const threadName = trimText(messageTitle, 30);

  const initialMembers = new Map();
  if (userIsMember(parentThreadInfo, sourceMessageInfo.creator.id)) {
    const {
      id: sourceAuthorID,
      username: sourceAuthorUsername,
    } = sourceMessageInfo.creator;
    invariant(
      sourceAuthorUsername,
      'sourceAuthorUsername should be set in createPendingSidebar',
    );
    const initialMemberUserInfo: GlobalAccountUserInfo = {
      id: sourceAuthorID,
      username: sourceAuthorUsername,
    };
    initialMembers.set(sourceAuthorID, initialMemberUserInfo);
  }
  const singleOtherUser = getSingleOtherUser(parentThreadInfo, viewerID);
  if (parentThreadType === threadTypes.PERSONAL && singleOtherUser) {
    const singleOtherUsername = parentThreadInfo.members.find(
      member => member.id === singleOtherUser,
    )?.username;
    invariant(
      singleOtherUsername,
      'singleOtherUsername should be set in createPendingSidebar',
    );
    const singleOtherUserInfo: GlobalAccountUserInfo = {
      id: singleOtherUser,
      username: singleOtherUsername,
    };
    initialMembers.set(singleOtherUser, singleOtherUserInfo);
  }

  return createPendingThread({
    viewerID,
    threadType: threadTypes.SIDEBAR,
    members: [...initialMembers.values()],
    parentThreadInfo,
    threadColor: color,
    name: threadName,
    sourceMessageID: sourceMessageInfo.id,
  });
}

// The message title here may have ETH addresses that aren't resolved to ENS
// names. This function should only be used in cases where we're sure that we
// don't care about the thread title. We should prefer createPendingSidebar
// wherever possible
type CreateUnresolvedPendingSidebarInput = {
  ...SharedCreatePendingSidebarInput,
  +markdownRules: ParserRules,
};
function createUnresolvedPendingSidebar(
  input: CreateUnresolvedPendingSidebarInput,
): ThreadInfo {
  const {
    sourceMessageInfo,
    parentThreadInfo,
    viewerID,
    markdownRules,
  } = input;

  const messageTitleEntityText = getMessageTitle(
    sourceMessageInfo,
    parentThreadInfo,
    markdownRules,
  );
  const messageTitle = entityTextToRawString(messageTitleEntityText, {
    ignoreViewer: true,
  });

  return baseCreatePendingSidebar({
    sourceMessageInfo,
    parentThreadInfo,
    messageTitle,
    viewerID,
  });
}

type CreatePendingSidebarInput = {
  ...SharedCreatePendingSidebarInput,
  +markdownRules: ParserRules,
  +getENSNames: ?GetENSNames,
};
async function createPendingSidebar(
  input: CreatePendingSidebarInput,
): Promise<ThreadInfo> {
  const {
    sourceMessageInfo,
    parentThreadInfo,
    viewerID,
    markdownRules,
    getENSNames,
  } = input;

  const messageTitleEntityText = getMessageTitle(
    sourceMessageInfo,
    parentThreadInfo,
    markdownRules,
  );
  const messageTitle = await getEntityTextAsString(
    messageTitleEntityText,
    getENSNames,
    { ignoreViewer: true },
  );
  invariant(
    messageTitle !== null && messageTitle !== undefined,
    'getEntityTextAsString only returns falsey when passed falsey',
  );

  return baseCreatePendingSidebar({
    sourceMessageInfo,
    parentThreadInfo,
    messageTitle,
    viewerID,
  });
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

type CreateRealThreadParameters = {
  +threadInfo: ThreadInfo,
  +dispatchActionPromise: DispatchActionPromise,
  +createNewThread: ClientNewThreadRequest => Promise<NewThreadResult>,
  +sourceMessageID: ?string,
  +viewerID: ?string,
  +handleError?: () => mixed,
  +calendarQuery: CalendarQuery,
};
async function createRealThreadFromPendingThread({
  threadInfo,
  dispatchActionPromise,
  createNewThread,
  sourceMessageID,
  viewerID,
  calendarQuery,
}: CreateRealThreadParameters): Promise<string> {
  if (!threadIsPending(threadInfo.id)) {
    return threadInfo.id;
  }

  const otherMemberIDs = threadOtherMembers(threadInfo.members, viewerID).map(
    member => member.id,
  );
  let resultPromise;
  if (threadInfo.type !== threadTypes.SIDEBAR) {
    invariant(
      otherMemberIDs.length > 0,
      'otherMemberIDs should not be empty for threads',
    );
    resultPromise = createNewThread({
      type: pendingThreadType(otherMemberIDs.length),
      initialMemberIDs: otherMemberIDs,
      color: threadInfo.color,
      calendarQuery,
    });
  } else {
    invariant(
      sourceMessageID,
      'sourceMessageID should be set when creating a sidebar',
    );
    resultPromise = createNewThread({
      type: threadTypes.SIDEBAR,
      initialMemberIDs: otherMemberIDs,
      color: threadInfo.color,
      sourceMessageID,
      parentThreadID: threadInfo.parentThreadID,
      name: threadInfo.name,
      calendarQuery,
    });
  }
  dispatchActionPromise(newThreadActionTypes, resultPromise);
  const { newThreadID } = await resultPromise;
  return newThreadID;
}

type RawThreadInfoOptions = {
  +includeVisibilityRules?: ?boolean,
  +filterMemberList?: ?boolean,
  +hideThreadStructure?: ?boolean,
  +shimThreadTypes?: ?{
    +[inType: ThreadType]: ThreadType,
  },
  +filterDetailedThreadEditPermissions?: boolean,
};
function rawThreadInfoFromServerThreadInfo(
  serverThreadInfo: ServerThreadInfo,
  viewerID: string,
  options?: RawThreadInfoOptions,
): ?RawThreadInfo {
  const includeVisibilityRules = options?.includeVisibilityRules;
  const filterMemberList = options?.filterMemberList;
  const hideThreadStructure = options?.hideThreadStructure;
  const shimThreadTypes = options?.shimThreadTypes;
  const filterDetailedThreadEditPermissions =
    options?.filterDetailedThreadEditPermissions;

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
    if (
      serverThreadInfo.id === genesis.id &&
      serverMember.id !== viewerID &&
      serverMember.id !== ashoat.id
    ) {
      continue;
    }
    const memberPermissions = filterThreadEditDetailedPermissions(
      serverMember.permissions,
      filterDetailedThreadEditPermissions,
    );
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
    currentUserPermissions = filterThreadEditDetailedPermissions(
      getAllThreadPermissions(null, serverThreadInfo.id),
      filterDetailedThreadEditPermissions,
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

  let { type } = serverThreadInfo;
  if (
    shimThreadTypes &&
    shimThreadTypes[type] !== null &&
    shimThreadTypes[type] !== undefined
  ) {
    type = shimThreadTypes[type];
  }

  let rawThreadInfo: any = {
    id: serverThreadInfo.id,
    type,
    name: serverThreadInfo.name,
    description: serverThreadInfo.description,
    color: serverThreadInfo.color,
    creationTime: serverThreadInfo.creationTime,
    parentThreadID: serverThreadInfo.parentThreadID,
    members,
    roles: serverThreadInfo.roles,
    currentUser,
    repliesCount: serverThreadInfo.repliesCount,
  };
  if (!hideThreadStructure) {
    rawThreadInfo = {
      ...rawThreadInfo,
      containingThreadID: serverThreadInfo.containingThreadID,
      community: serverThreadInfo.community,
    };
  }
  const sourceMessageID = serverThreadInfo.sourceMessageID;
  if (sourceMessageID) {
    rawThreadInfo = { ...rawThreadInfo, sourceMessageID };
  }
  if (includeVisibilityRules) {
    return {
      ...rawThreadInfo,
      visibilityRules: rawThreadInfo.type,
    };
  }
  return rawThreadInfo;
}

function filterThreadEditDetailedPermissions(
  permissions: ThreadPermissionsInfo,
  shouldFilter: ?boolean,
): ThreadPermissionsInfo {
  if (!shouldFilter) {
    return permissions;
  }
  const {
    edit_thread_color,
    edit_thread_description,
    ...newPermissions
  } = permissions;
  return newPermissions;
}

function threadUIName(threadInfo: ThreadInfo): string | ThreadEntity {
  if (threadInfo.name) {
    return firstLine(threadInfo.name);
  }
  const threadMembers = threadInfo.members.filter(
    memberInfo => memberInfo.role,
  );
  const memberEntities = threadMembers.map(member =>
    ET.user({ userInfo: member }),
  );
  return {
    type: 'thread',
    id: threadInfo.id,
    name: threadInfo.name,
    display: 'uiName',
    uiName: memberEntities,
  };
}

function threadInfoFromRawThreadInfo(
  rawThreadInfo: RawThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
): ThreadInfo {
  let threadInfo: ThreadInfo = {
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
  const { sourceMessageID } = rawThreadInfo;
  if (sourceMessageID) {
    threadInfo = { ...threadInfo, sourceMessageID };
  }
  return threadInfo;
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
    permissions: {
      ...threadInfo.currentUser.permissions,
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
    !!otherUserRelationshipStatus &&
    relationshipBlockedInEitherDirection(otherUserRelationshipStatus)
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
  let rawThreadInfo: RawThreadInfo = {
    id: threadInfo.id,
    type: threadInfo.type,
    name: threadInfo.name,
    description: threadInfo.description,
    color: threadInfo.color,
    creationTime: threadInfo.creationTime,
    parentThreadID: threadInfo.parentThreadID,
    containingThreadID: threadInfo.containingThreadID,
    community: threadInfo.community,
    members: threadInfo.members.map(relativeMemberInfo => ({
      id: relativeMemberInfo.id,
      role: relativeMemberInfo.role,
      permissions: relativeMemberInfo.permissions,
      isSender: relativeMemberInfo.isSender,
    })),
    roles: threadInfo.roles,
    currentUser: threadInfo.currentUser,
    repliesCount: threadInfo.repliesCount,
  };
  const { sourceMessageID } = threadInfo;
  if (sourceMessageID) {
    rawThreadInfo = { ...rawThreadInfo, sourceMessageID };
  }
  return rawThreadInfo;
}

const threadTypeDescriptions: { [ThreadType]: string } = {
  [threadTypes.COMMUNITY_OPEN_SUBTHREAD]:
    'Anybody in the parent channel can see an open subchannel.',
  [threadTypes.COMMUNITY_SECRET_SUBTHREAD]:
    'Only visible to its members and admins of ancestor channels.',
};

function usersInThreadInfo(threadInfo: RawThreadInfo | ThreadInfo): string[] {
  const userIDs = new Set();
  for (const member of threadInfo.members) {
    userIDs.add(member.id);
  }
  return [...userIDs];
}

function memberIsAdmin(
  memberInfo: RelativeMemberInfo | MemberInfo,
  threadInfo: ThreadInfo | RawThreadInfo,
): boolean {
  return !!(
    memberInfo.role && roleIsAdminRole(threadInfo.roles[memberInfo.role])
  );
}

// Since we don't have access to all of the ancestor ThreadInfos, we approximate
// "parent admin" as anybody with CHANGE_ROLE permissions.
function memberHasAdminPowers(
  memberInfo: RelativeMemberInfo | MemberInfo | ServerMemberInfo,
): boolean {
  return !!memberInfo.permissions[threadPermissions.CHANGE_ROLE]?.value;
}

function roleIsAdminRole(roleInfo: ?RoleInfo): boolean {
  return !!(roleInfo && !roleInfo.isDefault && roleInfo.name === 'Admins');
}

function threadHasAdminRole(
  threadInfo: ?(RawThreadInfo | ThreadInfo | ServerThreadInfo),
): boolean {
  if (!threadInfo) {
    return false;
  }
  return !!_find({ name: 'Admins' })(threadInfo.roles);
}

function threadOrParentThreadHasAdminRole(
  threadInfo: RawThreadInfo | ThreadInfo,
) {
  return (
    threadMembersWithoutAddedAshoat(threadInfo).filter(member =>
      memberHasAdminPowers(member),
    ).length > 0
  );
}

function identifyInvalidatedThreads(
  updateInfos: $ReadOnlyArray<ClientUpdateInfo>,
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
  threadPermissions.EDIT_THREAD_NAME,
  threadPermissions.EDIT_THREAD_COLOR,
  threadPermissions.EDIT_THREAD_DESCRIPTION,
  threadPermissions.CREATE_SUBCHANNELS,
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
const emptyItemText: string =
  `Background chats are just like normal chats, except they don't ` +
  `contribute to your unread count.\n\n` +
  `To move a chat over here, switch the “Background” option in its settings.`;

function threadNoun(threadType: ThreadType): string {
  if (threadType === threadTypes.SIDEBAR) {
    return 'thread';
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

function useWatchThread(threadInfo: ?ThreadInfo) {
  const dispatchActionPromise = useDispatchActionPromise();
  const callFetchMostRecentMessages = useServerCall(fetchMostRecentMessages);

  const threadID = threadInfo?.id;
  const threadNotInChatList = !threadInChatList(threadInfo);
  React.useEffect(() => {
    if (threadID && threadNotInChatList) {
      threadWatcher.watchID(threadID);
      dispatchActionPromise(
        fetchMostRecentMessagesActionTypes,
        callFetchMostRecentMessages(threadID),
      );
    }
    return () => {
      if (threadID && threadNotInChatList) {
        threadWatcher.removeID(threadID);
      }
    };
  }, [
    callFetchMostRecentMessages,
    dispatchActionPromise,
    threadNotInChatList,
    threadID,
  ]);
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
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
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

      if (!viewerID || !threadIsPending(baseThreadInfo.id)) {
        return baseThreadInfo;
      }

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
            members: userInfoInputArray,
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
      viewerID,
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
  threadInfo: ServerThreadInfo | RawThreadInfo | ThreadInfo,
  memberID: string,
  permission: ThreadPermission,
): boolean {
  for (const member of threadInfo.members) {
    if (member.id !== memberID) {
      continue;
    }
    return permissionLookup(member.permissions, permission);
  }
  return false;
}

function useCanCreateSidebarFromMessage(
  threadInfo: ThreadInfo,
  messageInfo: ComposableMessageInfo | RobotextMessageInfo,
): boolean {
  const messageCreatorUserInfo = useSelector(
    state => state.userStore.userInfos[messageInfo.creator.id],
  );

  if (!messageInfo.id || threadInfo.sourceMessageID === messageInfo.id) {
    return false;
  }

  const messageCreatorRelationship = messageCreatorUserInfo?.relationshipStatus;
  const creatorRelationshipHasBlock =
    messageCreatorRelationship &&
    relationshipBlockedInEitherDirection(messageCreatorRelationship);

  const hasPermission = threadHasPermission(
    threadInfo,
    threadPermissions.CREATE_SIDEBARS,
  );

  return hasPermission && !creatorRelationshipHasBlock;
}

function useSidebarExistsOrCanBeCreated(
  threadInfo: ThreadInfo,
  messageItem: ChatMessageInfoItem,
): boolean {
  const canCreateSidebarFromMessage = useCanCreateSidebarFromMessage(
    threadInfo,
    messageItem.messageInfo,
  );
  return !!messageItem.threadCreatedFromMessage || canCreateSidebarFromMessage;
}

function checkIfDefaultMembersAreVoiced(threadInfo: ThreadInfo): boolean {
  const defaultRoleID = Object.keys(threadInfo.roles).find(
    roleID => threadInfo.roles[roleID].isDefault,
  );
  invariant(
    defaultRoleID !== undefined,
    'all threads should have a default role',
  );
  const defaultRole = threadInfo.roles[defaultRoleID];
  return !!defaultRole.permissions[threadPermissions.VOICED];
}

function draftKeyFromThreadID(threadID: string): string {
  return `${threadID}/message_composer`;
}

function getContainingThreadID(
  parentThreadInfo: ?ServerThreadInfo | RawThreadInfo | ThreadInfo,
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
  parentThreadInfo: ?ServerThreadInfo | RawThreadInfo | ThreadInfo,
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

  const chatItems = [...privateThreads, ...personalThreads, ...otherThreads];
  if (loggedInUserInfo) {
    chatItems.push(
      ...usersSearchResults.map(user =>
        createPendingThreadItem(loggedInUserInfo, user),
      ),
    );
  }
  return chatItems;
}

type ThreadListSearchResult = {
  +threadSearchResults: $ReadOnlySet<string>,
  +usersSearchResults: $ReadOnlyArray<GlobalAccountUserInfo>,
};
function useThreadListSearch(
  chatListData: $ReadOnlyArray<ChatThreadItem>,
  searchText: string,
  viewerID: ?string,
): ThreadListSearchResult {
  const callSearchUsers = useServerCall(searchUserCall);
  const usersWithPersonalThread = useSelector(usersWithPersonalThreadSelector);
  const searchUsers = React.useCallback(
    async (usernamePrefix: string) => {
      if (usernamePrefix.length === 0) {
        return [];
      }

      const { userInfos } = await callSearchUsers(usernamePrefix);
      return userInfos.filter(
        info => !usersWithPersonalThread.has(info.id) && info.id !== viewerID,
      );
    },
    [callSearchUsers, usersWithPersonalThread, viewerID],
  );

  const [threadSearchResults, setThreadSearchResults] = React.useState(
    new Set(),
  );
  const [usersSearchResults, setUsersSearchResults] = React.useState([]);
  const threadSearchIndex = useGlobalThreadSearchIndex();
  React.useEffect(() => {
    (async () => {
      const results = threadSearchIndex.getSearchResults(searchText);
      setThreadSearchResults(new Set(results));
      const usersResults = await searchUsers(searchText);
      setUsersSearchResults(usersResults);
    })();
  }, [searchText, chatListData, threadSearchIndex, searchUsers]);

  return { threadSearchResults, usersSearchResults };
}

function removeMemberFromThread(
  threadInfo: ThreadInfo,
  memberInfo: RelativeMemberInfo,
  dispatchActionPromise: DispatchActionPromise,
  removeUserFromThreadServerCall: (
    threadID: string,
    memberIDs: $ReadOnlyArray<string>,
  ) => Promise<ChangeThreadSettingsPayload>,
) {
  const customKeyName = `${removeUsersFromThreadActionTypes.started}:${memberInfo.id}`;
  dispatchActionPromise(
    removeUsersFromThreadActionTypes,
    removeUserFromThreadServerCall(threadInfo.id, [memberInfo.id]),
    { customKeyName },
  );
}

function switchMemberAdminRoleInThread(
  threadInfo: ThreadInfo,
  memberInfo: RelativeMemberInfo,
  isCurrentlyAdmin: boolean,
  dispatchActionPromise: DispatchActionPromise,
  changeUserRoleServerCall: (
    threadID: string,
    memberIDs: $ReadOnlyArray<string>,
    newRole: string,
  ) => Promise<ChangeThreadSettingsPayload>,
) {
  let newRole = null;
  for (const roleID in threadInfo.roles) {
    const role = threadInfo.roles[roleID];
    if (isCurrentlyAdmin && role.isDefault) {
      newRole = role.id;
      break;
    } else if (!isCurrentlyAdmin && roleIsAdminRole(role)) {
      newRole = role.id;
      break;
    }
  }
  invariant(newRole !== null, 'Could not find new role');

  const customKeyName = `${changeThreadMemberRolesActionTypes.started}:${memberInfo.id}`;
  dispatchActionPromise(
    changeThreadMemberRolesActionTypes,
    changeUserRoleServerCall(threadInfo.id, [memberInfo.id], newRole),
    { customKeyName },
  );
}

function getAvailableThreadMemberActions(
  memberInfo: RelativeMemberInfo,
  threadInfo: ThreadInfo,
  canEdit: ?boolean = true,
): $ReadOnlyArray<'remove_user' | 'remove_admin' | 'make_admin'> {
  const role = memberInfo.role;
  if (!canEdit || !role) {
    return [];
  }

  const canRemoveMembers = threadHasPermission(
    threadInfo,
    threadPermissions.REMOVE_MEMBERS,
  );
  const canChangeRoles = threadHasPermission(
    threadInfo,
    threadPermissions.CHANGE_ROLE,
  );

  const result = [];
  if (
    canRemoveMembers &&
    !memberInfo.isViewer &&
    (canChangeRoles || threadInfo.roles[role]?.isDefault)
  ) {
    result.push('remove_user');
  }

  if (canChangeRoles && memberInfo.username && threadHasAdminRole(threadInfo)) {
    result.push(
      memberIsAdmin(memberInfo, threadInfo) ? 'remove_admin' : 'make_admin',
    );
  }

  return result;
}

export {
  colorIsDark,
  generateRandomColor,
  generatePendingThreadColor,
  threadHasPermission,
  viewerIsMember,
  threadInChatList,
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
  getSingleOtherUser,
  getPendingThreadID,
  pendingThreadIDRegex,
  parsePendingThreadID,
  createPendingThread,
  createUnresolvedPendingSidebar,
  createPendingSidebar,
  pendingThreadType,
  createRealThreadFromPendingThread,
  getCurrentUser,
  threadFrozenDueToBlock,
  threadFrozenDueToViewerBlock,
  rawThreadInfoFromServerThreadInfo,
  filterThreadEditDetailedPermissions,
  threadUIName,
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
  threadNoun,
  threadLabel,
  useWatchThread,
  useExistingThreadInfoFinder,
  getThreadTypeParentRequirement,
  threadMemberHasPermission,
  useCanCreateSidebarFromMessage,
  useSidebarExistsOrCanBeCreated,
  checkIfDefaultMembersAreVoiced,
  draftKeyFromThreadID,
  threadTypeCanBePending,
  getContainingThreadID,
  getCommunity,
  getThreadListSearchResults,
  useThreadListSearch,
  removeMemberFromThread,
  switchMemberAdminRoleInThread,
  getAvailableThreadMemberActions,
  selectedThreadColors,
  threadMembersWithoutAddedAshoat,
  validChatNameRegex,
  chatNameMaxLength,
};
