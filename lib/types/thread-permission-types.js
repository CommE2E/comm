// @flow

import invariant from 'invariant';
import t, { type TDict, type TUnion } from 'tcomb';

import { values } from '../utils/objects.js';
import { tBool, tShape, tID } from '../utils/validation-utils.js';

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
  MANAGE_INVITE_LINKS: 'manage_invite_links',
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
      ourThreadPermissions === 'manage_pins' ||
      ourThreadPermissions === 'manage_invite_links',
    'string is not threadPermissions enum',
  );
  return ourThreadPermissions;
}

const threadPermissionValidator = t.enums.of(values(threadPermissions));
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
export const threadPermissionInfoValidator: TUnion<ThreadPermissionInfo> =
  t.union([
    tShape({ value: tBool(true), source: tID }),
    tShape({ value: tBool(false), source: t.Nil }),
  ]);
export type ThreadPermissionsBlob = {
  +[permission: string]: ThreadPermissionInfo,
};
export type ThreadRolePermissionsBlob = { +[permission: string]: boolean };
export const threadRolePermissionsBlobValidator: TDict<ThreadRolePermissionsBlob> =
  t.dict(t.String, t.Boolean);
export type ThreadPermissionsInfo = {
  +[permission: ThreadPermission]: ThreadPermissionInfo,
};
export const threadPermissionsInfoValidator: TDict<ThreadPermissionsInfo> =
  t.dict(threadPermissionValidator, threadPermissionInfoValidator);
