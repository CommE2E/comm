// @flow

import PropTypes from 'prop-types';
import invariant from 'invariant';

export type VisibilityRules = 0 | 1 | 2 | 3 | 4;
export const visibilityRules = {
  OPEN: 0,
  CLOSED: 1,
  SECRET: 2,
  CHAT_NESTED_OPEN: 3,
  CHAT_SECRET: 4,
};
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

export type EditRules = 0 | 1;
export const editRules = {
  ANYBODY: 0,
  LOGGED_IN: 1,
};
export function assertEditRules(
  ourEditRules: number,
): EditRules {
  invariant(
    ourEditRules === 0 ||
      ourEditRules === 1,
    "number is not editRules enum",
  );
  return ourEditRules;
}

// Keep in sync with server/permissions.php
export type ThreadPermission =
  | "know_of"
  | "visible"
  | "voiced"
  | "edit_entries"
  | "edit_thread"
  | "delete_thread"
  | "create_subthreads"
  | "join_thread"
  | "edit_permissions"
  | "add_members";
export const threadPermissions = {
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
};
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
      ourThreadPermissions === "add_members",
    "string is not threadPermissions enum",
  );
  return ourThreadPermissions;
}

type ThreadPermissionInfo =
  | {| value: true, source: string |}
  | {| value: false, source: null |};
export type ThreadPermissionsBlob = {|
  [permission: ThreadPermission]: ThreadPermissionInfo,
|};
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
|};

export type ThreadCurrentUserInfo = {|
  role: ?string,
  subscribed: bool,
  permissions: ThreadPermissionsBlob,
|};

export type ThreadInfo = {|
  id: string,
  name: string,
  description: string,
  visibilityRules: VisibilityRules,
  color: string, // hex, without "#" or "0x"
  editRules: EditRules,
  creationTime: number, // millisecond timestamp
  parentThreadID: ?string,
  members: MemberInfo[],
  roles: {[id: string]: RoleInfo},
  currentUser: ThreadCurrentUserInfo,
|};

export const visibilityRulesPropType = PropTypes.oneOf([
  0, 1, 2, 3, 4,
]);

export const threadInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  visibilityRules: visibilityRulesPropType.isRequired,
  color: PropTypes.string.isRequired,
  editRules: PropTypes.oneOf([
    0, 1,
  ]).isRequired,
  creationTime: PropTypes.number.isRequired,
  parentThreadID: PropTypes.string,
  members: PropTypes.arrayOf(memberInfoPropType).isRequired,
  roles: PropTypes.objectOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    permissions: PropTypes.objectOf(PropTypes.bool).isRequired,
  })),
  currentUser: PropTypes.shape({
    role: PropTypes.string,
    subscribed: PropTypes.bool.isRequired,
    permissions: threadPermissionsBlobPropType.isRequired,
  }),
});
