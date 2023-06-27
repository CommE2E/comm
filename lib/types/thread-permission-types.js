// @flow

import invariant from 'invariant';
import t, { type TDict } from 'tcomb';

import { values } from '../utils/objects.js';
import { tBool, tShape } from '../utils/validation-utils.js';

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

type ConfigurableCommunityPermission = {
  // Type the permissions as `string`, as opposed to `ThreadPermission`,
  // because we open up the permissions to include an optional prefix
  // (i.e. `descendant_`) to propagate certain permissions down the community.
  +permissions: $ReadOnlyArray<string>,
  +title: string,
  +description: string,
};
export const configurableCommunityPermissions: $ReadOnlyArray<ConfigurableCommunityPermission> =
  [
    {
      permissions: [
        threadPermissions.EDIT_ENTRIES,
        threadPermissionPropagationPrefixes.DESCENDANT +
          threadPermissions.EDIT_ENTRIES,
      ],
      title: 'Edit calendar',
      description: 'Allows members to edit the community calendar',
    },
    {
      permissions: [
        threadPermissionPropagationPrefixes.DESCENDANT +
          threadPermissions.KNOW_OF,
        threadPermissionPropagationPrefixes.DESCENDANT +
          threadPermissions.VISIBLE,
      ],
      title: 'See secret channels',
      description: 'Allows members to see all secret channels',
    },
    {
      permissions: [threadPermissions.VOICED],
      title: 'Speak in announcement channels',
      description: 'Allows members to speak in announcement channels',
    },
    {
      permissions: [
        threadPermissions.EDIT_THREAD_NAME,
        threadPermissionPropagationPrefixes.DESCENDANT +
          threadPermissions.EDIT_THREAD_NAME,

        threadPermissions.EDIT_THREAD_DESCRIPTION,
        threadPermissionPropagationPrefixes.DESCENDANT +
          threadPermissions.EDIT_THREAD_DESCRIPTION,

        threadPermissions.EDIT_THREAD_COLOR,
        threadPermissionPropagationPrefixes.DESCENDANT +
          threadPermissions.EDIT_THREAD_COLOR,

        threadPermissions.CREATE_SUBCHANNELS,
        threadPermissionPropagationPrefixes.DESCENDANT +
          threadPermissionFilterPrefixes.TOP_LEVEL +
          threadPermissions.CREATE_SUBCHANNELS,

        threadPermissions.EDIT_THREAD_AVATAR,
        threadPermissionPropagationPrefixes.DESCENDANT +
          threadPermissions.EDIT_THREAD_AVATAR,
      ],
      title: 'Create and edit channels',
      description: 'Allows members to create new and edit existing channels',
    },
    {
      permissions: [
        threadPermissions.DELETE_THREAD,
        threadPermissionPropagationPrefixes.DESCENDANT +
          threadPermissions.DELETE_THREAD,
      ],
      title: 'Delete channels',
      description: 'Allows members to delete channels',
    },
    {
      permissions: [
        threadPermissions.ADD_MEMBERS,
        threadPermissionPropagationPrefixes.DESCENDANT +
          threadPermissions.ADD_MEMBERS,
      ],
      title: 'Add members',
      description: 'Allows members to add other members to channels',
    },
    {
      permissions: [
        threadPermissions.REMOVE_MEMBERS,
        threadPermissionPropagationPrefixes.DESCENDANT +
          threadPermissions.REMOVE_MEMBERS,
      ],
      title: 'Remove members',
      description: 'Allows members to remove other members from channels',
    },
    {
      permissions: [
        threadPermissions.CHANGE_ROLE,
        threadPermissionPropagationPrefixes.DESCENDANT +
          threadPermissions.CHANGE_ROLE,
      ],
      title: 'Change roles',
      description: 'Allows members to change the roles of other members',
    },
    {
      permissions: [
        threadPermissions.EDIT_PERMISSIONS,
        threadPermissionPropagationPrefixes.DESCENDANT +
          threadPermissions.EDIT_PERMISSIONS,
      ],
      title: 'Edit permissions',
      description: 'Allows members to edit visibility permissions of channels',
    },
    {
      permissions: [
        threadPermissions.MANAGE_PINS,
        threadPermissionPropagationPrefixes.DESCENDANT +
          threadPermissions.MANAGE_PINS,
      ],
      title: 'Manage pins',
      description: 'Allows members to pin or unpin messages in channels',
    },
    {
      permissions: [
        threadPermissions.REACT_TO_MESSAGE,
        threadPermissionPropagationPrefixes.DESCENDANT +
          threadPermissions.MANAGE_PINS,
      ],
      title: 'React to messages',
      description: 'Allows members to add reactions to messages',
    },
    {
      permissions: [
        threadPermissions.EDIT_MESSAGE,
        threadPermissionPropagationPrefixes.DESCENDANT +
          threadPermissions.EDIT_ENTRIES,
      ],
      title: 'Edit messages',
      description: 'Allows members to edit their sent messages',
    },
    {
      permissions: [
        threadPermissions.MANAGE_INVITE_LINKS,
        threadPermissionPropagationPrefixes.DESCENDANT +
          threadPermissions.MANAGE_INVITE_LINKS,
      ],
      title: 'Manage invite links',
      description: 'Allows members to handle invite links for the community',
    },
  ];
export const guarenteedCommunityPermissions: $ReadOnlyArray<string> = [
  // know_of | descendant_open_know_of
  threadPermissions.KNOW_OF,
  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissionFilterPrefixes.OPEN +
    threadPermissions.KNOW_OF,

  // voiced
  threadPermissionPropagationPrefixes.DESCENDANT + threadPermissions.VOICED,

  // visible | descendant_open_visible
  threadPermissions.VISIBLE,
  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissionFilterPrefixes.OPEN +
    threadPermissions.VISIBLE,

  // join_thread | child_open_join_thread | descendant_opentoplevel_join_thread
  threadPermissions.JOIN_THREAD,
  threadPermissionPropagationPrefixes.CHILD +
    threadPermissionFilterPrefixes.OPEN +
    threadPermissions.JOIN_THREAD,
  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissionFilterPrefixes.OPEN_TOP_LEVEL +
    threadPermissions.JOIN_THREAD,

  threadPermissions.CREATE_SIDEBARS,
  threadPermissions.LEAVE_THREAD,
];

export type ThreadPermissionInfo =
  | { +value: true, +source: string }
  | { +value: false, +source: null };
const threadPermissionInfoValidator = t.union([
  tShape({ value: tBool(true), source: t.String }),
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
