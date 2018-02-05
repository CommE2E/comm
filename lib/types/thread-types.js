// @flow

import PropTypes from 'prop-types';
import invariant from 'invariant';

export const visibilityRules = {
  OPEN: 0,
  CLOSED: 1,
  SECRET: 2,
  CHAT_NESTED_OPEN: 3,
  CHAT_SECRET: 4,
};
export type VisibilityRules =
  | typeof visibilityRules.OPEN
  | typeof visibilityRules.CLOSED
  | typeof visibilityRules.SECRET
  | typeof visibilityRules.CHAT_NESTED_OPEN
  | typeof visibilityRules.CHAT_SECRET;
export function assertVisibilityRules(
  ourVisibilityRules: number,
): VisibilityRules {
  invariant(
    ourVisibilityRules === visibilityRules.OPEN ||
      ourVisibilityRules === visibilityRules.CLOSED ||
      ourVisibilityRules === visibilityRules.SECRET ||
      ourVisibilityRules === visibilityRules.CHAT_NESTED_OPEN ||
      ourVisibilityRules === visibilityRules.CHAT_SECRET,
    "number is not visibilityRules enum",
  );
  return ourVisibilityRules;
}

// Keep in sync with server/permissions.php
export const threadPermissions: { [key: string]: ThreadPermission } = {
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
};
export type ThreadPermission =
  | typeof threadPermissions.KNOW_OF
  | typeof threadPermissions.VISIBLE
  | typeof threadPermissions.VOICED
  | typeof threadPermissions.EDIT_ENTRIES
  | typeof threadPermissions.EDIT_THREAD
  | typeof threadPermissions.DELETE_THREAD
  | typeof threadPermissions.CREATE_SUBTHREADS
  | typeof threadPermissions.JOIN_THREAD
  | typeof threadPermissions.EDIT_PERMISSIONS
  | typeof threadPermissions.ADD_MEMBERS
  | typeof threadPermissions.REMOVE_MEMBERS
  | typeof threadPermissions.CHANGE_ROLE;
export function assertThreadPermissions(
  ourThreadPermissions: string,
): ThreadPermission {
  invariant(
    ourThreadPermissions === threadPermissions.KNOW_OF ||
      ourThreadPermissions === threadPermissions.VISIBLE ||
      ourThreadPermissions === threadPermissions.VOICED ||
      ourThreadPermissions === threadPermissions.EDIT_ENTRIES ||
      ourThreadPermissions === threadPermissions.EDIT_THREAD ||
      ourThreadPermissions === threadPermissions.DELETE_THREAD ||
      ourThreadPermissions === threadPermissions.CREATE_SUBTHREADS ||
      ourThreadPermissions === threadPermissions.JOIN_THREAD ||
      ourThreadPermissions === threadPermissions.EDIT_PERMISSIONS ||
      ourThreadPermissions === threadPermissions.ADD_MEMBERS ||
      ourThreadPermissions === threadPermissions.REMOVE_MEMBERS ||
      ourThreadPermissions === threadPermissions.CHANGE_ROLE,
    "string is not threadPermissions enum",
  );
  return ourThreadPermissions;
}

type ThreadPermissionInfo =
  | {| value: true, source: string |}
  | {| value: false, source: null |};
export type ThreadPermissionsBlob = {
  [permission: ThreadPermission]: ThreadPermissionInfo,
};
export const threadPermissionsBlobPropType = PropTypes.objectOf(
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
  permissions: ThreadPermissionsBlob,
|};
export const memberInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  role: PropTypes.string,
  permissions: threadPermissionsBlobPropType.isRequired,
});

export type RelativeMemberInfo = {|
  ...MemberInfo,
  username: ?string,
  isViewer: bool,
|};
export const relativeMemberInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  role: PropTypes.string,
  permissions: threadPermissionsBlobPropType.isRequired,
  username: PropTypes.string,
  isViewer: PropTypes.bool.isRequired,
});

export type RoleInfo = {|
  id: string,
  name: string,
  // This is not a ThreadPermissionsBlob. It can include keys with prefixes, and
  // no sources are listed, as this blob is itself a self-contained source.
  permissions: {| [permission: string]: bool |},
  isDefault: bool,
|};

export type ThreadCurrentUserInfo = {|
  role: ?string,
  subscribed: bool,
  permissions: ThreadPermissionsBlob,
  unread: ?bool,
|};

export type RawThreadInfo = {|
  id: string,
  name: ?string,
  description: string,
  visibilityRules: VisibilityRules,
  color: string, // hex, without "#" or "0x"
  creationTime: number, // millisecond timestamp
  parentThreadID: ?string,
  members: MemberInfo[],
  roles: {[id: string]: RoleInfo},
  currentUser: ThreadCurrentUserInfo,
|};

export type ThreadInfo = {|
  id: string,
  name: ?string,
  uiName: string,
  description: string,
  visibilityRules: VisibilityRules,
  color: string, // hex, without "#" or "0x"
  creationTime: number, // millisecond timestamp
  parentThreadID: ?string,
  members: MemberInfo[],
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

export const rawThreadInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string,
  description: PropTypes.string.isRequired,
  visibilityRules: visibilityRulesPropType.isRequired,
  color: PropTypes.string.isRequired,
  creationTime: PropTypes.number.isRequired,
  parentThreadID: PropTypes.string,
  members: PropTypes.arrayOf(memberInfoPropType).isRequired,
  roles: PropTypes.objectOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    permissions: PropTypes.objectOf(PropTypes.bool).isRequired,
    isDefault: PropTypes.bool.isRequired,
  })),
  currentUser: PropTypes.shape({
    role: PropTypes.string,
    subscribed: PropTypes.bool.isRequired,
    permissions: threadPermissionsBlobPropType.isRequired,
    unread: PropTypes.bool,
  }),
});

export const threadInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string,
  uiName: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  visibilityRules: visibilityRulesPropType.isRequired,
  color: PropTypes.string.isRequired,
  creationTime: PropTypes.number.isRequired,
  parentThreadID: PropTypes.string,
  members: PropTypes.arrayOf(memberInfoPropType).isRequired,
  roles: PropTypes.objectOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    permissions: PropTypes.objectOf(PropTypes.bool).isRequired,
    isDefault: PropTypes.bool.isRequired,
  })),
  currentUser: PropTypes.shape({
    role: PropTypes.string,
    subscribed: PropTypes.bool.isRequired,
    permissions: threadPermissionsBlobPropType.isRequired,
    unread: PropTypes.bool,
  }),
});
