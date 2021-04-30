// @flow

import invariant from 'invariant';
import _find from 'lodash/fp/find';
import * as React from 'react';
import { type ParserRules } from 'simple-markdown';
import tinycolor from 'tinycolor2';

import {
  fetchMostRecentMessagesActionTypes,
  fetchMostRecentMessages,
} from '../actions/message-actions';
import { newThreadActionTypes } from '../actions/thread-actions';
import {
  permissionLookup,
  getAllThreadPermissions,
  makePermissionsBlob,
} from '../permissions/thread-permissions';
import type {
  ChatThreadItem,
  ChatMessageInfoItem,
} from '../selectors/chat-selectors';
import {
  threadInfoSelector,
  pendingToRealizedThreadIDsSelector,
} from '../selectors/thread-selectors';
import type { CalendarQuery } from '../types/entry-types';
import type {
  RobotextMessageInfo,
  ComposableMessageInfo,
} from '../types/message-types';
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
  type ThreadType,
  type ClientNewThreadRequest,
  type NewThreadResult,
  threadTypes,
  threadPermissions,
} from '../types/thread-types';
import { type UpdateInfo, updateTypes } from '../types/update-types';
import type {
  GlobalAccountUserInfo,
  UserInfos,
  UserInfo,
  AccountUserInfo,
} from '../types/user-types';
import { useDispatchActionPromise, useServerCall } from '../utils/action-utils';
import type { DispatchActionPromise } from '../utils/action-utils';
import { useSelector } from '../utils/redux-utils';
import { firstLine } from '../utils/string-utils';
import { pluralize, trimText } from '../utils/text-utils';
import { getMessageTitle } from './message-utils';
import { relationshipBlockedInEitherDirection } from './relationship-utils';
import threadWatcher from './thread-watcher';

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

function generatePendingThreadColor(userIDs: $ReadOnlyArray<string>) {
  const ids = [...userIDs].sort().join('#');

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

function getThreadOtherUsers(
  threadInfo: ThreadInfo | RawThreadInfo,
  viewerID: ?string,
): string[] {
  return threadInfo.members
    .filter((member) => member.role && member.id !== viewerID)
    .map((member) => member.id);
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

function getPendingThreadID(
  threadType: ThreadType,
  memberIDs: $ReadOnlyArray<string>,
  sourceMessageID: ?string,
) {
  const pendingThreadKey = sourceMessageID
    ? `sidebar/${sourceMessageID}`
    : [...memberIDs].sort().join('+');
  return `pending/type${threadType}/${pendingThreadKey}`;
}

type CreatePendingThreadArgs = {|
  +viewerID: string,
  +threadType: ThreadType,
  +members?: $ReadOnlyArray<GlobalAccountUserInfo | UserInfo>,
  +parentThreadID?: ?string,
  +threadColor?: ?string,
  +name?: ?string,
  +sourceMessageID?: string,
|};

function createPendingThread({
  viewerID,
  threadType,
  members,
  parentThreadID,
  threadColor,
  name,
  sourceMessageID,
}: CreatePendingThreadArgs) {
  const now = Date.now();
  members = members ?? [];
  const nonViewerMemberIDs = members.map((member) => member.id);
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
    parentThreadID: parentThreadID ?? null,
    members: [
      {
        id: viewerID,
        role: role.id,
        permissions: membershipPermissions,
        isSender: false,
      },
      ...members.map((member) => ({
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
  members.forEach((member) => (userInfos[member.id] = member));

  return threadInfoFromRawThreadInfo(rawThreadInfo, viewerID, userInfos);
}

function createPendingThreadItem(
  viewerID: string,
  user: GlobalAccountUserInfo,
): ChatThreadItem {
  const threadInfo = createPendingThread({
    viewerID,
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

function createPendingSidebar(
  messageInfo: ComposableMessageInfo | RobotextMessageInfo,
  threadInfo: ThreadInfo,
  viewerID: string,
  markdownRules: ParserRules,
) {
  const { id, username } = messageInfo.creator;
  const { id: parentThreadID, color } = threadInfo;

  const messageTitle = getMessageTitle(
    messageInfo,
    threadInfo,
    markdownRules,
    'global_viewer',
  );
  const threadName = trimText(messageTitle, 30);

  invariant(username, 'username should be set in createPendingSidebar');
  const initialMemberUserInfo: GlobalAccountUserInfo = { id, username };
  const creatorIsMember = userIsMember(threadInfo, id);
  return createPendingThread({
    viewerID,
    threadType: threadTypes.SIDEBAR,
    members: creatorIsMember ? [initialMemberUserInfo] : [],
    parentThreadID,
    threadColor: color,
    name: threadName,
    sourceMessageID: messageInfo.id,
  });
}

function pendingThreadType(numberOfOtherMembers: number) {
  return numberOfOtherMembers === 1
    ? threadTypes.PERSONAL
    : threadTypes.CHAT_SECRET;
}

type CreateRealThreadParameters = {|
  +threadInfo: ThreadInfo,
  +dispatchActionPromise: DispatchActionPromise,
  +createNewThread: (ClientNewThreadRequest) => Promise<NewThreadResult>,
  +sourceMessageID: ?string,
  +viewerID: ?string,
  +handleError?: () => mixed,
  +calendarQuery: CalendarQuery,
|};
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

  const otherMemberIDs = getThreadOtherUsers(threadInfo, viewerID);
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
      isSender: serverMember.isSender,
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

  const rawThreadInfo: RawThreadInfo = {
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
    repliesCount: serverThreadInfo.repliesCount,
  };
  const sourceMessageID = serverThreadInfo.sourceMessageID;
  if (sourceMessageID) {
    rawThreadInfo.sourceMessageID = sourceMessageID;
  }
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
  const uiName = threadInfo.name
    ? threadInfo.name
    : robotextName(threadInfo, viewerID, userInfos);
  return firstLine(uiName);
}

function threadInfoFromRawThreadInfo(
  rawThreadInfo: RawThreadInfo,
  viewerID: ?string,
  userInfos: UserInfos,
): ThreadInfo {
  const threadInfo: ThreadInfo = {
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
    repliesCount: rawThreadInfo.repliesCount,
  };
  const { sourceMessageID } = rawThreadInfo;
  if (sourceMessageID) {
    threadInfo.sourceMessageID = sourceMessageID;
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
  const rawThreadInfo: RawThreadInfo = {
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
    repliesCount: threadInfo.repliesCount,
  };
  const { sourceMessageID } = threadInfo;
  if (sourceMessageID) {
    rawThreadInfo.sourceMessageID = sourceMessageID;
  }
  return rawThreadInfo;
}

const threadTypeDescriptions = {
  [threadTypes.CHAT_NESTED_OPEN]:
    'Anybody in the parent thread can see an open child thread.',
  [threadTypes.CHAT_SECRET]:
    'Only visible to its members and admins of ancestor threads.',
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
  viewerID: ?string,
): string => {
  const searchTextArray = [];
  if (threadInfo.name) {
    searchTextArray.push(threadInfo.name);
  }
  if (threadInfo.description) {
    searchTextArray.push(threadInfo.description);
  }
  for (const member of threadInfo.members) {
    const isParentAdmin = memberHasAdminPowers(member);
    if (!member.role && !isParentAdmin) {
      continue;
    }
    if (member.id === viewerID) {
      continue;
    }
    const userInfo = userInfos[member.id];
    if (userInfo && userInfo.username) {
      searchTextArray.push(userInfo.username);
    }
  }
  return searchTextArray.join(' ');
};

function threadNoun(threadType: ThreadType) {
  return threadType === threadTypes.SIDEBAR ? 'sidebar' : 'thread';
}

function threadLabel(threadType: ThreadType) {
  if (threadType === threadTypes.CHAT_SECRET) {
    return 'Secret';
  } else if (threadType === threadTypes.PERSONAL) {
    return 'Personal';
  } else if (threadType === threadTypes.SIDEBAR) {
    return 'Sidebar';
  } else if (threadType === threadTypes.PRIVATE) {
    return 'Private';
  } else if (threadType === threadTypes.CHAT_NESTED_OPEN) {
    return 'Open';
  }
  invariant(false, `unexpected threadType ${threadType}`);
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

type UseCurrentThreadInfoArgs = {|
  +baseThreadInfo: ?ThreadInfo,
  +searching: boolean,
  +userInfoInputArray: $ReadOnlyArray<AccountUserInfo>,
|};
function useCurrentThreadInfo({
  baseThreadInfo,
  searching,
  userInfoInputArray,
}: UseCurrentThreadInfoArgs) {
  const threadInfos = useSelector(threadInfoSelector);
  const viewerID = useSelector(
    (state) => state.currentUserInfo && state.currentUserInfo.id,
  );
  const userInfos = useSelector((state) => state.userStore.userInfos);

  const pendingToRealizedThreadIDs = useSelector((state) =>
    pendingToRealizedThreadIDsSelector(state.threadStore.threadInfos),
  );
  const latestThreadInfo = React.useMemo((): ?ThreadInfo => {
    if (!baseThreadInfo) {
      return null;
    }

    const threadInfoFromParams = baseThreadInfo;
    const threadInfoFromStore = threadInfos[threadInfoFromParams.id];

    if (threadInfoFromStore) {
      return threadInfoFromStore;
    } else if (!viewerID || !threadIsPending(threadInfoFromParams.id)) {
      return undefined;
    }

    const { sourceMessageID } = threadInfoFromParams;
    const pendingThreadID = searching
      ? getPendingThreadID(
          pendingThreadType(userInfoInputArray.length),
          [...userInfoInputArray.map((user) => user.id), viewerID],
          sourceMessageID,
        )
      : getPendingThreadID(
          threadInfoFromParams.type,
          threadInfoFromParams.members.map((member) => member.id),
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
      : threadInfoFromParams;
    return {
      ...updatedThread,
      currentUser: getCurrentUser(updatedThread, viewerID, userInfos),
    };
  }, [
    baseThreadInfo,
    threadInfos,
    viewerID,
    searching,
    userInfoInputArray,
    pendingToRealizedThreadIDs,
    userInfos,
  ]);

  return latestThreadInfo ? latestThreadInfo : baseThreadInfo;
}

type ThreadTypeParentRequirement = 'optional' | 'required' | 'disabled';
function getThreadTypeParentRequirement(
  threadType: ThreadType,
): ThreadTypeParentRequirement {
  if (
    threadType === threadTypes.CHAT_NESTED_OPEN ||
    threadType === threadTypes.SIDEBAR
  ) {
    return 'required';
  } else if (
    threadType === threadTypes.PERSONAL ||
    threadType === threadTypes.PRIVATE
  ) {
    return 'disabled';
  } else {
    return 'optional';
  }
}

function threadMemberHasPermission(
  threadInfo: ServerThreadInfo,
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
) {
  const messageCreatorUserInfo = useSelector(
    (state) => state.userStore.userInfos[messageInfo.creator.id],
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
) {
  const canCreateSidebarFromMessage = useCanCreateSidebarFromMessage(
    threadInfo,
    messageItem.messageInfo,
  );
  return !!messageItem.threadCreatedFromMessage || canCreateSidebarFromMessage;
}

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
  getSingleOtherUser,
  getPendingThreadID,
  createPendingThread,
  createPendingThreadItem,
  createPendingSidebar,
  pendingThreadType,
  createRealThreadFromPendingThread,
  getCurrentUser,
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
  threadNoun,
  threadLabel,
  useWatchThread,
  useCurrentThreadInfo,
  getThreadTypeParentRequirement,
  threadMemberHasPermission,
  useCanCreateSidebarFromMessage,
  useSidebarExistsOrCanBeCreated,
};
