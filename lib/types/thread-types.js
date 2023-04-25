// @flow

import invariant from 'invariant';

import type {
  AvatarDBContent,
  ClientAvatar,
  UpdateUserAvatarRequest,
} from './avatar-types.js';
import type { Shape } from './core.js';
import type { CalendarQuery, RawEntryInfo } from './entry-types.js';
import type { Media } from './media-types.js';
import type {
  RawMessageInfo,
  MessageTruncationStatuses,
} from './message-types.js';
import type { ThreadSubscription } from './subscription-types.js';
import type { ServerUpdateInfo, ClientUpdateInfo } from './update-types.js';
import type { UserInfo, UserInfos } from './user-types.js';
import type { ThreadEntity } from '../utils/entity-text.js';

export const threadTypes = Object.freeze({
  //OPEN: 0,   (DEPRECATED)
  //CLOSED: 1, (DEPRECATED)
  //SECRET: 2, (DEPRECATED)
  // has parent, not top-level (appears under parent in inbox), and visible to
  // all members of parent
  SIDEBAR: 5,
  // canonical thread for each pair of users. represents the friendship
  PERSONAL: 6,
  // canonical thread for each single user
  PRIVATE: 7,
  // local "thick" thread (outside of community). no parent, can only have
  // sidebar children. currently a proxy for COMMUNITY_SECRET_SUBTHREAD until we
  // launch actual E2E
  LOCAL: 4,
  // aka "org". no parent, top-level, has admin
  COMMUNITY_ROOT: 8,
  // like COMMUNITY_ROOT, but members aren't voiced
  COMMUNITY_ANNOUNCEMENT_ROOT: 9,
  // an open subthread. has parent, top-level (not sidebar), and visible to all
  // members of parent. root ancestor is a COMMUNITY_ROOT
  COMMUNITY_OPEN_SUBTHREAD: 3,
  // like COMMUNITY_SECRET_SUBTHREAD, but members aren't voiced
  COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD: 10,
  // a secret subthread. optional parent, top-level (not sidebar), visible only
  // to its members. root ancestor is a COMMUNITY_ROOT
  COMMUNITY_SECRET_SUBTHREAD: 4,
  // like COMMUNITY_SECRET_SUBTHREAD, but members aren't voiced
  COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD: 11,
  // like COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD, but you can't leave
  GENESIS: 12,
});
export type ThreadType = $Values<typeof threadTypes>;
export function assertThreadType(threadType: number): ThreadType {
  invariant(
    threadType === 3 ||
      threadType === 4 ||
      threadType === 5 ||
      threadType === 6 ||
      threadType === 7 ||
      threadType === 8 ||
      threadType === 9 ||
      threadType === 10 ||
      threadType === 11 ||
      threadType === 12,
    'number is not ThreadType enum',
  );
  return threadType;
}
export const communityThreadTypes: $ReadOnlyArray<number> = Object.freeze([
  threadTypes.COMMUNITY_ROOT,
  threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT,
  threadTypes.GENESIS,
]);

export const communitySubthreads: $ReadOnlyArray<number> = Object.freeze([
  threadTypes.COMMUNITY_OPEN_SUBTHREAD,
  threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD,
  threadTypes.COMMUNITY_SECRET_SUBTHREAD,
  threadTypes.COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD,
]);

export function threadTypeIsCommunityRoot(threadType: ThreadType): boolean {
  return communityThreadTypes.includes(threadType);
}

export const threadPermissions = Object.freeze({
  KNOW_OF: 'know_of',
  MEMBERSHIP_DEPRECATED: 'membership',
  VISIBLE: 'visible',
  VOICED: 'voiced',
  EDIT_ENTRIES: 'edit_entries',
  EDIT_THREAD_NAME: 'edit_thread',
  EDIT_THREAD_DESCRIPTION: 'edit_thread_description',
  EDIT_THREAD_COLOR: 'edit_thread_color',
  DELETE_THREAD: 'delete_thread',
  CREATE_SUBCHANNELS: 'create_subthreads',
  CREATE_SIDEBARS: 'create_sidebars',
  JOIN_THREAD: 'join_thread',
  EDIT_PERMISSIONS: 'edit_permissions',
  ADD_MEMBERS: 'add_members',
  REMOVE_MEMBERS: 'remove_members',
  CHANGE_ROLE: 'change_role',
  LEAVE_THREAD: 'leave_thread',
  REACT_TO_MESSAGE: 'react_to_message',
  EDIT_MESSAGE: 'edit_message',
  EDIT_THREAD_AVATAR: 'edit_thread_avatar',
  MANAGE_PINS: 'manage_pins',
});
export type ThreadPermission = $Values<typeof threadPermissions>;
export function assertThreadPermissions(
  ourThreadPermissions: string,
): ThreadPermission {
  invariant(
    ourThreadPermissions === 'know_of' ||
      ourThreadPermissions === 'membership' ||
      ourThreadPermissions === 'visible' ||
      ourThreadPermissions === 'voiced' ||
      ourThreadPermissions === 'edit_entries' ||
      ourThreadPermissions === 'edit_thread' ||
      ourThreadPermissions === 'edit_thread_description' ||
      ourThreadPermissions === 'edit_thread_color' ||
      ourThreadPermissions === 'delete_thread' ||
      ourThreadPermissions === 'create_subthreads' ||
      ourThreadPermissions === 'create_sidebars' ||
      ourThreadPermissions === 'join_thread' ||
      ourThreadPermissions === 'edit_permissions' ||
      ourThreadPermissions === 'add_members' ||
      ourThreadPermissions === 'remove_members' ||
      ourThreadPermissions === 'change_role' ||
      ourThreadPermissions === 'leave_thread' ||
      ourThreadPermissions === 'react_to_message' ||
      ourThreadPermissions === 'edit_message' ||
      ourThreadPermissions === 'edit_thread_avatar' ||
      ourThreadPermissions === 'manage_pins',
    'string is not threadPermissions enum',
  );
  return ourThreadPermissions;
}

export const threadPermissionPropagationPrefixes = Object.freeze({
  DESCENDANT: 'descendant_',
  CHILD: 'child_',
});
export type ThreadPermissionPropagationPrefix = $Values<
  typeof threadPermissionPropagationPrefixes,
>;

export const threadPermissionFilterPrefixes = Object.freeze({
  // includes only SIDEBAR, COMMUNITY_OPEN_SUBTHREAD,
  // COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD
  OPEN: 'open_',
  // excludes only SIDEBAR
  TOP_LEVEL: 'toplevel_',
  // includes only COMMUNITY_OPEN_SUBTHREAD,
  // COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD
  OPEN_TOP_LEVEL: 'opentoplevel_',
});
export type ThreadPermissionFilterPrefix = $Values<
  typeof threadPermissionFilterPrefixes,
>;

export type ThreadPermissionInfo =
  | { +value: true, +source: string }
  | { +value: false, +source: null };

export type ThreadPermissionsBlob = {
  +[permission: string]: ThreadPermissionInfo,
};
export type ThreadRolePermissionsBlob = { +[permission: string]: boolean };

export type ThreadPermissionsInfo = {
  +[permission: ThreadPermission]: ThreadPermissionInfo,
};

export type MemberInfo = {
  +id: string,
  +role: ?string,
  +permissions: ThreadPermissionsInfo,
  +isSender: boolean,
};

export type RelativeMemberInfo = {
  ...MemberInfo,
  +username: ?string,
  +isViewer: boolean,
};

export type RoleInfo = {
  +id: string,
  +name: string,
  +permissions: ThreadRolePermissionsBlob,
  +isDefault: boolean,
};

export type ThreadCurrentUserInfo = {
  +role: ?string,
  +permissions: ThreadPermissionsInfo,
  +subscription: ThreadSubscription,
  +unread: ?boolean,
};

export type RawThreadInfo = {
  +id: string,
  +type: ThreadType,
  +name: ?string,
  +avatar?: ?ClientAvatar,
  +description: ?string,
  +color: string, // hex, without "#" or "0x"
  +creationTime: number, // millisecond timestamp
  +parentThreadID: ?string,
  +containingThreadID: ?string,
  +community: ?string,
  +members: $ReadOnlyArray<MemberInfo>,
  +roles: { +[id: string]: RoleInfo },
  +currentUser: ThreadCurrentUserInfo,
  +sourceMessageID?: string,
  +repliesCount: number,
  +pinnedCount?: number,
};

export type ThreadInfo = {
  +id: string,
  +type: ThreadType,
  +name: ?string,
  +uiName: string | ThreadEntity,
  +avatar?: ?ClientAvatar,
  +description: ?string,
  +color: string, // hex, without "#" or "0x"
  +creationTime: number, // millisecond timestamp
  +parentThreadID: ?string,
  +containingThreadID: ?string,
  +community: ?string,
  +members: $ReadOnlyArray<RelativeMemberInfo>,
  +roles: { +[id: string]: RoleInfo },
  +currentUser: ThreadCurrentUserInfo,
  +sourceMessageID?: string,
  +repliesCount: number,
  +pinnedCount?: number,
};

export type ResolvedThreadInfo = {
  +id: string,
  +type: ThreadType,
  +name: ?string,
  +uiName: string,
  +avatar?: ?ClientAvatar,
  +description: ?string,
  +color: string, // hex, without "#" or "0x"
  +creationTime: number, // millisecond timestamp
  +parentThreadID: ?string,
  +containingThreadID: ?string,
  +community: ?string,
  +members: $ReadOnlyArray<RelativeMemberInfo>,
  +roles: { +[id: string]: RoleInfo },
  +currentUser: ThreadCurrentUserInfo,
  +sourceMessageID?: string,
  +repliesCount: number,
  +pinnedCount?: number,
};

export type ServerMemberInfo = {
  +id: string,
  +role: ?string,
  +permissions: ThreadPermissionsInfo,
  +subscription: ThreadSubscription,
  +unread: ?boolean,
  +isSender: boolean,
};

export type ServerThreadInfo = {
  +id: string,
  +type: ThreadType,
  +name: ?string,
  +avatar?: AvatarDBContent,
  +description: ?string,
  +color: string, // hex, without "#" or "0x"
  +creationTime: number, // millisecond timestamp
  +parentThreadID: ?string,
  +containingThreadID: ?string,
  +community: ?string,
  +depth: number,
  +members: $ReadOnlyArray<ServerMemberInfo>,
  +roles: { +[id: string]: RoleInfo },
  +sourceMessageID?: string,
  +repliesCount: number,
  +pinnedCount: number,
};

export type ThreadStore = {
  +threadInfos: { +[id: string]: RawThreadInfo },
};

export type RemoveThreadOperation = {
  +type: 'remove',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveAllThreadsOperation = {
  +type: 'remove_all',
};

export type ReplaceThreadOperation = {
  +type: 'replace',
  +payload: { +id: string, +threadInfo: RawThreadInfo },
};

export type ThreadStoreOperation =
  | RemoveThreadOperation
  | RemoveAllThreadsOperation
  | ReplaceThreadOperation;

export type ClientDBThreadInfo = {
  +id: string,
  +type: number,
  +name: ?string,
  +avatar?: ?string,
  +description: ?string,
  +color: string,
  +creationTime: string,
  +parentThreadID: ?string,
  +containingThreadID: ?string,
  +community: ?string,
  +members: string,
  +roles: string,
  +currentUser: string,
  +sourceMessageID?: string,
  +repliesCount: number,
  +pinnedCount?: number,
};

export type ClientDBReplaceThreadOperation = {
  +type: 'replace',
  +payload: ClientDBThreadInfo,
};

export type ClientDBThreadStoreOperation =
  | RemoveThreadOperation
  | RemoveAllThreadsOperation
  | ClientDBReplaceThreadOperation;

export type ThreadDeletionRequest = {
  +threadID: string,
  +accountPassword: ?string,
};

export type RemoveMembersRequest = {
  +threadID: string,
  +memberIDs: $ReadOnlyArray<string>,
};

export type RoleChangeRequest = {
  +threadID: string,
  +memberIDs: $ReadOnlyArray<string>,
  +role: string,
};

export type ChangeThreadSettingsResult = {
  +threadInfo?: RawThreadInfo,
  +threadInfos?: { +[id: string]: RawThreadInfo },
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  },
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
};

export type ChangeThreadSettingsPayload = {
  +threadID: string,
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
  },
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
};

export type LeaveThreadRequest = {
  +threadID: string,
};
export type LeaveThreadResult = {
  +threadInfos?: { +[id: string]: RawThreadInfo },
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  },
};

export type LeaveThreadPayload = {
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
  },
};

export type ThreadChanges = Shape<{
  +type: ThreadType,
  +name: string,
  +description: string,
  +color: string,
  +parentThreadID: ?string,
  +newMemberIDs: $ReadOnlyArray<string>,
  +avatar: UpdateUserAvatarRequest,
}>;

export type UpdateThreadRequest = {
  +threadID: string,
  +changes: ThreadChanges,
};

export type BaseNewThreadRequest = {
  +id?: ?string,
  +name?: ?string,
  +description?: ?string,
  +color?: ?string,
  +parentThreadID?: ?string,
  +initialMemberIDs?: ?$ReadOnlyArray<string>,
  +ghostMemberIDs?: ?$ReadOnlyArray<string>,
};
type NewThreadRequest =
  | {
      +type: 3 | 4 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
      ...BaseNewThreadRequest,
    }
  | {
      +type: 5,
      +sourceMessageID: string,
      ...BaseNewThreadRequest,
    };

export type ClientNewThreadRequest = {
  ...NewThreadRequest,
  +calendarQuery: CalendarQuery,
};
export type ServerNewThreadRequest = {
  ...NewThreadRequest,
  +calendarQuery?: ?CalendarQuery,
};

export type NewThreadResponse = {
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  },
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +newThreadInfo?: RawThreadInfo,
  +userInfos: UserInfos,
  +newThreadID?: string,
};
export type NewThreadResult = {
  +updatesResult: {
    +newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
  },
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +userInfos: UserInfos,
  +newThreadID: string,
};

export type ServerThreadJoinRequest = {
  +threadID: string,
  +calendarQuery?: ?CalendarQuery,
};
export type ClientThreadJoinRequest = {
  +threadID: string,
  +calendarQuery: CalendarQuery,
};
export type ThreadJoinResult = {
  threadInfos?: { +[id: string]: RawThreadInfo },
  updatesResult: {
    newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  },
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  truncationStatuses: MessageTruncationStatuses,
  userInfos: UserInfos,
  rawEntryInfos?: ?$ReadOnlyArray<RawEntryInfo>,
};
export type ThreadJoinPayload = {
  +updatesResult: {
    newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
  },
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatuses: MessageTruncationStatuses,
  +userInfos: $ReadOnlyArray<UserInfo>,
};

export type ThreadFetchMediaResult = {
  +media: $ReadOnlyArray<Media>,
};
export type ThreadFetchMediaRequest = {
  +threadID: string,
  +limit: number,
  +offset: number,
};

export type SidebarInfo = {
  +threadInfo: ThreadInfo,
  +lastUpdatedTime: number,
  +mostRecentNonLocalMessage: ?string,
};

export type ToggleMessagePinRequest = {
  +messageID: string,
  +action: 'pin' | 'unpin',
};

export type ToggleMessagePinResult = {
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +threadID: string,
};

// We can show a max of 3 sidebars inline underneath their parent in the chat
// tab. If there are more, we show a button that opens a modal to see the rest
export const maxReadSidebars = 3;

// We can show a max of 5 sidebars inline underneath their parent
// in the chat tab if every one of the displayed sidebars is unread
export const maxUnreadSidebars = 5;

export type ThreadStoreThreadInfos = { +[id: string]: RawThreadInfo };
