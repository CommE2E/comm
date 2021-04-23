// @flow

import invariant from 'invariant';

import type { Shape } from './core';
import type { CalendarQuery, RawEntryInfo } from './entry-types';
import type {
  RawMessageInfo,
  MessageTruncationStatuses,
} from './message-types';
import type { ClientThreadInconsistencyReportCreationRequest } from './report-types';
import type { ThreadSubscription } from './subscription-types';
import type { UpdateInfo } from './update-types';
import type { UserInfo, AccountUserInfo } from './user-types';

export const threadTypes = Object.freeze({
  //OPEN: 0,   (DEPRECATED)
  //CLOSED: 1, (DEPRECATED)
  //SECRET: 2, (DEPRECATED)
  // an open subthread. has parent, top-level (not sidebar), and visible to all
  // members of parent
  CHAT_NESTED_OPEN: 3,
  // basic thread type. optional parent, top-level (not sidebar), visible only
  // to its members
  CHAT_SECRET: 4,
  // has parent, not top-level (appears under parent in inbox), and visible to
  // all members of parent
  SIDEBAR: 5,
  // canonical thread for each pair of users. represents the friendship
  PERSONAL: 6,
  // canonical thread for each single user
  PRIVATE: 7,
});
export type ThreadType = $Values<typeof threadTypes>;
export function assertThreadType(threadType: number): ThreadType {
  invariant(
    threadType === 3 ||
      threadType === 4 ||
      threadType === 5 ||
      threadType === 6 ||
      threadType === 7,
    'number is not ThreadType enum',
  );
  return threadType;
}

export const threadPermissions = Object.freeze({
  KNOW_OF: 'know_of',
  VISIBLE: 'visible',
  VOICED: 'voiced',
  EDIT_ENTRIES: 'edit_entries',
  EDIT_THREAD: 'edit_thread',
  DELETE_THREAD: 'delete_thread',
  CREATE_SUBTHREADS: 'create_subthreads',
  CREATE_SIDEBARS: 'create_sidebars',
  JOIN_THREAD: 'join_thread',
  EDIT_PERMISSIONS: 'edit_permissions',
  ADD_MEMBERS: 'add_members',
  REMOVE_MEMBERS: 'remove_members',
  CHANGE_ROLE: 'change_role',
  LEAVE_THREAD: 'leave_thread',
});
export type ThreadPermission = $Values<typeof threadPermissions>;
export function assertThreadPermissions(
  ourThreadPermissions: string,
): ThreadPermission {
  invariant(
    ourThreadPermissions === 'know_of' ||
      ourThreadPermissions === 'visible' ||
      ourThreadPermissions === 'voiced' ||
      ourThreadPermissions === 'edit_entries' ||
      ourThreadPermissions === 'edit_thread' ||
      ourThreadPermissions === 'delete_thread' ||
      ourThreadPermissions === 'create_subthreads' ||
      ourThreadPermissions === 'create_sidebars' ||
      ourThreadPermissions === 'join_thread' ||
      ourThreadPermissions === 'edit_permissions' ||
      ourThreadPermissions === 'add_members' ||
      ourThreadPermissions === 'remove_members' ||
      ourThreadPermissions === 'change_role' ||
      ourThreadPermissions === 'leave_thread',
    'string is not threadPermissions enum',
  );
  return ourThreadPermissions;
}

export const threadPermissionPrefixes = Object.freeze({
  DESCENDANT: 'descendant_',
  CHILD: 'child_',
  OPEN: 'open_',
  OPEN_DESCENDANT: 'descendant_open_',
});

export type ThreadPermissionInfo =
  | {| +value: true, +source: string |}
  | {| +value: false, +source: null |};

export type ThreadPermissionsBlob = {
  +[permission: string]: ThreadPermissionInfo,
};
export type ThreadRolePermissionsBlob = { +[permission: string]: boolean };

export type ThreadPermissionsInfo = {
  +[permission: ThreadPermission]: ThreadPermissionInfo,
};

export type MemberInfo = {|
  +id: string,
  +role: ?string,
  +permissions: ThreadPermissionsInfo,
  +isSender: boolean,
|};

export type RelativeMemberInfo = {|
  ...MemberInfo,
  +username: ?string,
  +isViewer: boolean,
|};

export type RoleInfo = {|
  +id: string,
  +name: string,
  +permissions: ThreadRolePermissionsBlob,
  +isDefault: boolean,
|};

export type ThreadCurrentUserInfo = {|
  +role: ?string,
  +permissions: ThreadPermissionsInfo,
  +subscription: ThreadSubscription,
  +unread: ?boolean,
|};

export type RawThreadInfo = {|
  id: string,
  type: ThreadType,
  name: ?string,
  description: ?string,
  color: string, // hex, without "#" or "0x"
  creationTime: number, // millisecond timestamp
  parentThreadID: ?string,
  members: $ReadOnlyArray<MemberInfo>,
  roles: { [id: string]: RoleInfo },
  currentUser: ThreadCurrentUserInfo,
  sourceMessageID?: string,
  repliesCount: number,
|};

export type ThreadInfo = {|
  id: string,
  type: ThreadType,
  name: ?string,
  uiName: string,
  description: ?string,
  color: string, // hex, without "#" or "0x"
  creationTime: number, // millisecond timestamp
  parentThreadID: ?string,
  members: $ReadOnlyArray<MemberInfo>,
  roles: { [id: string]: RoleInfo },
  currentUser: ThreadCurrentUserInfo,
  sourceMessageID?: string,
  repliesCount: number,
|};

export type ServerMemberInfo = {|
  +id: string,
  +role: ?string,
  +permissions: ThreadPermissionsInfo,
  +subscription: ThreadSubscription,
  +unread: ?boolean,
  +isSender: boolean,
|};

export type ServerThreadInfo = {|
  +id: string,
  +type: ThreadType,
  +name: ?string,
  +description: ?string,
  +color: string, // hex, without "#" or "0x"
  +creationTime: number, // millisecond timestamp
  +parentThreadID: ?string,
  +members: $ReadOnlyArray<ServerMemberInfo>,
  +roles: { [id: string]: RoleInfo },
  +sourceMessageID?: string,
  +repliesCount: number,
|};

export type ThreadStore = {|
  +threadInfos: { [id: string]: RawThreadInfo },
  +inconsistencyReports: $ReadOnlyArray<ClientThreadInconsistencyReportCreationRequest>,
|};

export type ThreadDeletionRequest = {|
  +threadID: string,
  +accountPassword: string,
|};

export type RemoveMembersRequest = {|
  +threadID: string,
  +memberIDs: $ReadOnlyArray<string>,
|};

export type RoleChangeRequest = {|
  +threadID: string,
  +memberIDs: $ReadOnlyArray<string>,
  +role: string,
|};

export type ChangeThreadSettingsResult = {|
  +threadInfo?: RawThreadInfo,
  +threadInfos?: { [id: string]: RawThreadInfo },
  +updatesResult: {
    newUpdates: $ReadOnlyArray<UpdateInfo>,
  },
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
|};

export type ChangeThreadSettingsPayload = {|
  +threadID: string,
  +updatesResult: {
    newUpdates: $ReadOnlyArray<UpdateInfo>,
  },
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
|};

export type LeaveThreadRequest = {|
  +threadID: string,
|};
export type LeaveThreadResult = {|
  +threadInfos?: { [id: string]: RawThreadInfo },
  +updatesResult: {
    newUpdates: $ReadOnlyArray<UpdateInfo>,
  },
|};

export type LeaveThreadPayload = {|
  +updatesResult: {
    newUpdates: $ReadOnlyArray<UpdateInfo>,
  },
|};

export type ThreadChanges = Shape<{|
  +type: ThreadType,
  +name: string,
  +description: string,
  +color: string,
  +parentThreadID: string,
  +newMemberIDs: $ReadOnlyArray<string>,
|}>;

export type UpdateThreadRequest = {|
  +threadID: string,
  +changes: ThreadChanges,
|};

export type BaseNewThreadRequest = {|
  +name?: ?string,
  +description?: ?string,
  +color?: ?string,
  +parentThreadID?: ?string,
  +initialMemberIDs?: ?$ReadOnlyArray<string>,
  +ghostMemberIDs?: ?$ReadOnlyArray<string>,
|};
export type NewThreadRequest =
  | {|
      +type: 3 | 4 | 6 | 7,
      ...BaseNewThreadRequest,
    |}
  | {|
      +type: 5,
      +sourceMessageID: string,
      ...BaseNewThreadRequest,
    |};

export type NewThreadResponse = {|
  +updatesResult: {|
    +newUpdates: $ReadOnlyArray<UpdateInfo>,
  |},
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +newThreadInfo?: RawThreadInfo,
  +userInfos: { [string]: AccountUserInfo },
  +newThreadID?: string,
|};
export type NewThreadResult = {|
  +updatesResult: {|
    +newUpdates: $ReadOnlyArray<UpdateInfo>,
  |},
  +newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +userInfos: { [string]: AccountUserInfo },
  +newThreadID: string,
|};

export type ServerThreadJoinRequest = {|
  +threadID: string,
  +calendarQuery?: ?CalendarQuery,
|};
export type ClientThreadJoinRequest = {|
  +threadID: string,
  +calendarQuery: CalendarQuery,
|};
export type ThreadJoinResult = {|
  threadInfos?: { [id: string]: RawThreadInfo },
  updatesResult: {
    newUpdates: $ReadOnlyArray<UpdateInfo>,
  },
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  truncationStatuses: MessageTruncationStatuses,
  userInfos: { [string]: AccountUserInfo },
  rawEntryInfos?: ?$ReadOnlyArray<RawEntryInfo>,
|};
export type ThreadJoinPayload = {|
  +updatesResult: {
    newUpdates: $ReadOnlyArray<UpdateInfo>,
  },
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatuses: MessageTruncationStatuses,
  +userInfos: $ReadOnlyArray<UserInfo>,
|};

export type SidebarInfo = {|
  +threadInfo: ThreadInfo,
  +lastUpdatedTime: number,
  +mostRecentNonLocalMessage: ?string,
|};

// We can show a max of 3 sidebars inline underneath their parent in the chat
// tab. If there are more, we show a button that opens a modal to see the rest
export const maxReadSidebars = 3;

// We can show a max of 5 sidebars inline underneath their parent
// in the chat tab if every one of the displayed sidebars is unread
export const maxUnreadSidebars = 5;
