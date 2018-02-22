// @flow

import type { ThreadSubscription } from './subscription-types';
import type {
  RawMessageInfo,
  MessageTruncationStatuses,
} from './message-types';
import type { UserInfo, UserInfos } from './user-types';

import PropTypes from 'prop-types';
import invariant from 'invariant';

export const visibilityRules = Object.freeze({
  OPEN: 0,
  CLOSED: 1,
  SECRET: 2,
  CHAT_NESTED_OPEN: 3,
  CHAT_SECRET: 4,
});
export type VisibilityRules = $Values<typeof visibilityRules>;
export function assertVisibilityRules(
  ourVisibilityRules: number,
): VisibilityRules {
  invariant(
    ourVisibilityRules === 0 ||
      ourVisibilityRules === 1 ||
      ourVisibilityRules === 2 ||
      ourVisibilityRules === 3 ||
      ourVisibilityRules === 4,
    "number is not visibilityRules enum",
  );
  return ourVisibilityRules;
}

// Keep in sync with server/permissions.php
export const threadPermissions = Object.freeze({
  KNOW_OF: "know_of",
  VISIBLE: "visible",
  VOICED: "voiced",
  EDIT_ENTRIES: "edit_entries",
  EDIT_THREAD: "edit_thread",
  DELETE_THREAD: "delete_thread",
  CREATE_SUBTHREADS: "create_subthreads",
  JOIN_THREAD: "join_thread",
  EDIT_PERMISSIONS: "edit_permissions",
  ADD_MEMBERS: "add_members",
  REMOVE_MEMBERS: "remove_members",
  CHANGE_ROLE: "change_role",
});
export type ThreadPermission = $Values<typeof threadPermissions>;
export function assertThreadPermissions(
  ourThreadPermissions: string,
): ThreadPermission {
  invariant(
    ourThreadPermissions === "know_of" ||
      ourThreadPermissions === "visible" ||
      ourThreadPermissions === "voiced" ||
      ourThreadPermissions === "edit_entries" ||
      ourThreadPermissions === "edit_thread" ||
      ourThreadPermissions === "delete_thread" ||
      ourThreadPermissions === "create_subthreads" ||
      ourThreadPermissions === "join_thread" ||
      ourThreadPermissions === "edit_permissions" ||
      ourThreadPermissions === "add_members" ||
      ourThreadPermissions === "remove_members" ||
      ourThreadPermissions === "change_role",
    "string is not threadPermissions enum",
  );
  return ourThreadPermissions;
}

export const threadPermissionPrefixes = Object.freeze({
  DESCENDANT: "descendant_",
  CHILD: "child_",
  OPEN: "open_",
  OPEN_DESCENDANT: "descendant_open_",
});

export type ThreadPermissionInfo =
  | {| value: true, source: string |}
  | {| value: false, source: null |};

export type ThreadPermissionsBlob =
  {[permission: string]: ThreadPermissionInfo};
export type ThreadRolePermissionsBlob = {[permission: string]: bool};

export type ThreadPermissionsInfo = {
  [permission: ThreadPermission]: ThreadPermissionInfo,
} & ThreadPermissionsBlob;
export const threadPermissionsInfoPropType = PropTypes.objectOf(
  PropTypes.oneOfType([
    PropTypes.shape({
      value: PropTypes.oneOf([ true ]),
      source: PropTypes.string.isRequired,
    }),
    PropTypes.shape({
      value: PropTypes.oneOf([ false ]),
      source: PropTypes.oneOf([ null ]),
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
  isViewer: bool,
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
  isDefault: bool,
|};

export type ThreadCurrentUserInfo = {|
  role: ?string,
  permissions: ThreadPermissionsInfo,
  subscription: ThreadSubscription,
  unread: ?bool,
|};

export type RawThreadInfo = {|
  id: string,
  name: ?string,
  description: ?string,
  visibilityRules: VisibilityRules,
  color: string, // hex, without "#" or "0x"
  creationTime: number, // millisecond timestamp
  parentThreadID: ?string,
  members: $ReadOnlyArray<MemberInfo>,
  roles: {[id: string]: RoleInfo},
  currentUser: ThreadCurrentUserInfo,
|};

export type ThreadInfo = {|
  id: string,
  name: ?string,
  uiName: string,
  description: ?string,
  visibilityRules: VisibilityRules,
  color: string, // hex, without "#" or "0x"
  creationTime: number, // millisecond timestamp
  parentThreadID: ?string,
  members: $ReadOnlyArray<MemberInfo>,
  roles: {[id: string]: RoleInfo},
  currentUser: ThreadCurrentUserInfo,
|};

export const visibilityRulesPropType = PropTypes.oneOf([
  visibilityRules.OPEN,
  visibilityRules.CLOSED,
  visibilityRules.SECRET,
  visibilityRules.CHAT_NESTED_OPEN,
  visibilityRules.CHAT_SECRET,
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
  name: PropTypes.string,
  description: PropTypes.string,
  visibilityRules: visibilityRulesPropType.isRequired,
  color: PropTypes.string.isRequired,
  creationTime: PropTypes.number.isRequired,
  parentThreadID: PropTypes.string,
  members: PropTypes.arrayOf(memberInfoPropType).isRequired,
  roles: PropTypes.objectOf(rolePropType).isRequired,
  currentUser: currentUserPropType.isRequired,
});

export const threadInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string,
  uiName: PropTypes.string.isRequired,
  description: PropTypes.string,
  visibilityRules: visibilityRulesPropType.isRequired,
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
  unread: ?bool,
|};

export type ServerThreadInfo = {|
  id: string,
  name: ?string,
  description: ?string,
  visibilityRules: VisibilityRules,
  color: string, // hex, without "#" or "0x"
  creationTime: number, // millisecond timestamp
  parentThreadID: ?string,
  members: $ReadOnlyArray<ServerMemberInfo>,
  roles: {[id: string]: RoleInfo},
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
  threadInfo: RawThreadInfo,
  newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
|};

export type LeaveThreadRequest = {|
  threadID: string,
|};
export type LeaveThreadResult = {|
  threadInfos: {[id: string]: RawThreadInfo},
|};

export type LeaveThreadPayload = {|
  ...LeaveThreadResult,
  threadID: string,
|};

export type UpdateThreadRequest = {|
  threadID: string,
  changes: {|
    name?: ?string,
    description?: ?string,
    color?: ?string,
    password?: ?string,
    parentThreadID?: ?string,
    visibilityRules?: ?VisibilityRules,
    newMemberIDs?: ?$ReadOnlyArray<string>,
  |},
  accountPassword?: string,
|};

export type DeleteThreadPayload = {|
  threadID: string,
|};

export type NewThreadRequest = {|
  name?: ?string,
  description?: ?string,
  color?: ?string,
  password?: ?string,
  parentThreadID?: ?string,
  visibilityRules: VisibilityRules,
  initialMemberIDs?: ?$ReadOnlyArray<string>,
|};
export type NewThreadResult = {|
  newThreadInfo: RawThreadInfo,
  newMessageInfos: $ReadOnlyArray<RawMessageInfo>,
|};

export type ThreadJoinRequest = {|
  threadID: string,
  password?: ?string,
|};
export type ThreadJoinResult = {|
  threadInfos: {[id: string]: RawThreadInfo},
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  truncationStatuses: MessageTruncationStatuses,
  userInfos: UserInfos,
|};
export type ThreadJoinPayload = {|
  threadID: string,
  threadInfos: {[id: string]: RawThreadInfo},
  rawMessageInfos: RawMessageInfo[],
  truncationStatuses: MessageTruncationStatuses,
  userInfos: $ReadOnlyArray<UserInfo>,
|};
