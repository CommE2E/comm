// @flow

import type { ThreadSubscription } from './subscription-types';
import type {
  RawMessageInfo,
  MessageTruncationStatuses,
} from './message-types';
import type { UserInfo, AccountUserInfo } from './user-types';
import type {
  CalendarQuery,
  CalendarResult,
  RawEntryInfo,
} from './entry-types';
import type { UpdateInfo } from './update-types';
import type { ClientThreadInconsistencyReportCreationRequest } from './report-types';

import PropTypes from 'prop-types';
import invariant from 'invariant';

export const threadTypes = Object.freeze({
  //OPEN: 0,   (DEPRECATED)
  //CLOSED: 1, (DEPRECATED)
  //SECRET: 2, (DEPRECATED)
  CHAT_NESTED_OPEN: 3,
  CHAT_SECRET: 4,
  SIDEBAR: 5,
});
export type ThreadType = $Values<typeof threadTypes>;
export function assertThreadType(threadType: number): ThreadType {
  invariant(
    threadType === 3 || threadType === 4 || threadType === 5,
    'number is not ThreadType enum',
  );
  return threadType;
}

// Keep in sync with server/permissions.php
export const threadPermissions = Object.freeze({
  KNOW_OF: 'know_of',
  VISIBLE: 'visible',
  VOICED: 'voiced',
  EDIT_ENTRIES: 'edit_entries',
  EDIT_THREAD: 'edit_thread',
  DELETE_THREAD: 'delete_thread',
  CREATE_SUBTHREADS: 'create_subthreads',
  JOIN_THREAD: 'join_thread',
  EDIT_PERMISSIONS: 'edit_permissions',
  ADD_MEMBERS: 'add_members',
  REMOVE_MEMBERS: 'remove_members',
  CHANGE_ROLE: 'change_role',
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
      ourThreadPermissions === 'join_thread' ||
      ourThreadPermissions === 'edit_permissions' ||
      ourThreadPermissions === 'add_members' ||
      ourThreadPermissions === 'remove_members' ||
      ourThreadPermissions === 'change_role',
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
  | {| value: true, source: string |}
  | {| value: false, source: null |};

export type ThreadPermissionsBlob = {
  [permission: string]: ThreadPermissionInfo,
};
export type ThreadRolePermissionsBlob = { [permission: string]: boolean };

export type ThreadPermissionsInfo = {
  [permission: ThreadPermission]: ThreadPermissionInfo,
} & ThreadPermissionsBlob;
export const threadPermissionsInfoPropType = PropTypes.objectOf(
  PropTypes.oneOfType([
    PropTypes.shape({
      value: PropTypes.oneOf([true]),
      source: PropTypes.string.isRequired,
    }),
    PropTypes.shape({
      value: PropTypes.oneOf([false]),
      source: PropTypes.oneOf([null]),
    }),
  ]),
);

export type MemberInfo = {|
  id: string,
  role: ?string,
  permissions: ThreadPermissionsInfo,
|};
export const memberInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  role: PropTypes.string,
  permissions: threadPermissionsInfoPropType.isRequired,
});

export type RelativeMemberInfo = {|
  ...MemberInfo,
  username: ?string,
  isViewer: boolean,
|};
export const relativeMemberInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  role: PropTypes.string,
  permissions: threadPermissionsInfoPropType.isRequired,
  username: PropTypes.string,
  isViewer: PropTypes.bool.isRequired,
});

export type RoleInfo = {|
  id: string,
  name: string,
  permissions: ThreadRolePermissionsBlob,
  isDefault: boolean,
|};

export type ThreadCurrentUserInfo = {|
  role: ?string,
  permissions: ThreadPermissionsInfo,
  subscription: ThreadSubscription,
  unread: ?boolean,
|};

export type RawThreadInfo = {|
  id: string,
  type: ThreadType,
  visibilityRules: ThreadType,
  name: ?string,
  description: ?string,
  color: string, // hex, without "#" or "0x"
  creationTime: number, // millisecond timestamp
  parentThreadID: ?string,
  members: $ReadOnlyArray<MemberInfo>,
  roles: { [id: string]: RoleInfo },
  currentUser: ThreadCurrentUserInfo,
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
|};

export const threadTypePropType = PropTypes.oneOf([
  threadTypes.CHAT_NESTED_OPEN,
  threadTypes.CHAT_SECRET,
  threadTypes.SIDEBAR,
]);

const rolePropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  permissions: PropTypes.objectOf(PropTypes.bool).isRequired,
  isDefault: PropTypes.bool.isRequired,
});

const currentUserPropType = PropTypes.shape({
  role: PropTypes.string,
  permissions: threadPermissionsInfoPropType.isRequired,
  subscription: PropTypes.shape({
    pushNotifs: PropTypes.bool.isRequired,
    home: PropTypes.bool.isRequired,
  }).isRequired,
  unread: PropTypes.bool,
});

export const rawThreadInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  type: threadTypePropType.isRequired,
  name: PropTypes.string,
  description: PropTypes.string,
  color: PropTypes.string.isRequired,
  creationTime: PropTypes.number.isRequired,
  parentThreadID: PropTypes.string,
  members: PropTypes.arrayOf(memberInfoPropType).isRequired,
  roles: PropTypes.objectOf(rolePropType).isRequired,
  currentUser: currentUserPropType.isRequired,
});

export const threadInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  type: threadTypePropType.isRequired,
  name: PropTypes.string,
  uiName: PropTypes.string.isRequired,
  description: PropTypes.string,
  color: PropTypes.string.isRequired,
  creationTime: PropTypes.number.isRequired,
  parentThreadID: PropTypes.string,
  members: PropTypes.arrayOf(memberInfoPropType).isRequired,
  roles: PropTypes.objectOf(rolePropType).isRequired,
  currentUser: currentUserPropType.isRequired,
});

export type ServerMemberInfo = {|
  id: string,
  role: ?string,
  permissions: ThreadPermissionsInfo,
  subscription: ThreadSubscription,
  unread: ?boolean,
|};

export type ServerThreadInfo = {|
  id: string,
  type: ThreadType,
  visibilityRules: ThreadType,
  name: ?string,
  description: ?string,
  color: string, // hex, without "#" or "0x"
  creationTime: number, // millisecond timestamp
  parentThreadID: ?string,
  members: $ReadOnlyArray<ServerMemberInfo>,
  roles: { [id: string]: RoleInfo },
|};

export type ThreadStore = {|
  threadInfos: { [id: string]: RawThreadInfo },
  inconsistencyReports: $ReadOnlyArray<ClientThreadInconsistencyReportCreationRequest>,
|};

export type ThreadDeletionRequest = {|
  threadID: string,
  accountPassword: string,
|};

export type RemoveMembersRequest = {|
  threadID: string,
  memberIDs: $ReadOnlyArray<string>,
|};

export type RoleChangeRequest = {|
  threadID: string,
  memberIDs: $ReadOnlyArray<string>,
  role: string,
|};

export type ChangeThreadSettingsResult = {|
  threadInfo?: RawThreadInfo,
  threadInfos?: { [id: string]: RawThreadInfo },
  updatesResult: {
    newUpdates: $ReadOnlyArray<UpdateInfo>,
  },
  newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
|};

export type ChangeThreadSettingsPayload = {|
  threadID: string,
  updatesResult: {
    newUpdates: $ReadOnlyArray<UpdateInfo>,
  },
  newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
|};

export type LeaveThreadRequest = {|
  threadID: string,
|};
export type LeaveThreadResult = {|
  threadInfos?: { [id: string]: RawThreadInfo },
  updatesResult: {
    newUpdates: $ReadOnlyArray<UpdateInfo>,
  },
|};

export type LeaveThreadPayload = {|
  updatesResult: {
    newUpdates: $ReadOnlyArray<UpdateInfo>,
  },
|};

export type ThreadChanges = $Shape<{|
  type: ThreadType,
  name: string,
  description: string,
  color: string,
  parentThreadID: string,
  newMemberIDs: $ReadOnlyArray<string>,
|}>;

export type UpdateThreadRequest = {|
  threadID: string,
  changes: ThreadChanges,
  accountPassword?: ?string,
|};

export type NewThreadRequest = {|
  type: ThreadType,
  name?: ?string,
  description?: ?string,
  color?: ?string,
  parentThreadID?: ?string,
  initialMemberIDs?: ?$ReadOnlyArray<string>,
|};
export type NewThreadResponse = {|
  updatesResult: {
    newUpdates: $ReadOnlyArray<UpdateInfo>,
  },
  newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  newThreadInfo?: RawThreadInfo,
  newThreadID?: string,
|};
export type NewThreadResult = {|
  updatesResult: {
    newUpdates: $ReadOnlyArray<UpdateInfo>,
  },
  newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  newThreadID: string,
|};

export type ServerThreadJoinRequest = {|
  threadID: string,
  calendarQuery?: ?CalendarQuery,
|};
export type ClientThreadJoinRequest = {|
  threadID: string,
  calendarQuery: CalendarQuery,
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
  updatesResult: {
    newUpdates: $ReadOnlyArray<UpdateInfo>,
  },
  rawMessageInfos: RawMessageInfo[],
  truncationStatuses: MessageTruncationStatuses,
  userInfos: $ReadOnlyArray<UserInfo>,
  calendarResult: CalendarResult,
|};
