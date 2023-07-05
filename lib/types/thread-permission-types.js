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

const calendarEditPermission = {
  title: 'Edit calendar',
  description: 'Allows members to edit the community calendar',
};
const editEntries = threadPermissions.EDIT_ENTRIES;
const descendantEditEntries =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.EDIT_ENTRIES;

const secretChannelsPermission = {
  title: 'See secret channels',
  description: 'Allows members to see all secret channels',
};
const descendantKnowOf =
  threadPermissionPropagationPrefixes.DESCENDANT + threadPermissions.KNOW_OF;
const descendantVisible =
  threadPermissionPropagationPrefixes.DESCENDANT + threadPermissions.VISIBLE;

const voicedPermission = {
  title: 'Speak in announcement channels',
  description: 'Allows members to speak in announcement channels',
};
const voiced = threadPermissions.VOICED;

const createAndEditChannelsPermission = {
  title: 'Create and edit channels',
  description: 'Allows members to create new and edit existing channels',
};
const editThreadName = threadPermissions.EDIT_THREAD_NAME;
const descendantEditThreadName =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.EDIT_THREAD_NAME;
const editThreadDescription = threadPermissions.EDIT_THREAD_DESCRIPTION;
const descendantEditThreadDescription =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.EDIT_THREAD_DESCRIPTION;
const editThreadColor = threadPermissions.EDIT_THREAD_COLOR;
const descendantEditThreadColor =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.EDIT_THREAD_COLOR;
const createSubchannels = threadPermissions.CREATE_SUBCHANNELS;
const descendantCreateSubchannels =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissionFilterPrefixes.TOP_LEVEL +
  threadPermissions.CREATE_SUBCHANNELS;
const editThreadAvatar = threadPermissions.EDIT_THREAD_AVATAR;
const descendantEditThreadAvatar =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.EDIT_THREAD_AVATAR;

const deleteChannelsPermission = {
  title: 'Delete channels',
  description: 'Allows members to delete channels',
};
const deleteThread = threadPermissions.DELETE_THREAD;
const descendantDeleteThread =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.DELETE_THREAD;

const addMembersPermission = {
  title: 'Add members',
  description: 'Allows members to add other members to channels',
};
const addMembers = threadPermissions.ADD_MEMBERS;
const descendantAddMembers =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.ADD_MEMBERS;

const removeMembersPermission = {
  title: 'Remove members',
  description: 'Allows members to remove other members from channels',
};
const removeMembers = threadPermissions.REMOVE_MEMBERS;
const descendantRemoveMembers =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.REMOVE_MEMBERS;

const changeRolePermission = {
  title: 'Change roles',
  description: 'Allows members to change the roles of other members',
};
const changeRole = threadPermissions.CHANGE_ROLE;
const descendantChangeRole =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.CHANGE_ROLE;

const editVisibilityPermission = {
  title: 'Edit visibility',
  description: 'Allows members to edit visibility permissions of channels',
};
const editPermissions = threadPermissions.EDIT_PERMISSIONS;
const descendantEditPermissions =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.EDIT_PERMISSIONS;

const managePinsPermission = {
  title: 'Manage pins',
  description: 'Allows members to pin or unpin messages in channels',
};
const managePins = threadPermissions.MANAGE_PINS;
const descendantManagePins =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.MANAGE_PINS;

const reactToMessagePermission = {
  title: 'React to messages',
  description: 'Allows members to add reactions to messages',
};
const reactToMessage = threadPermissions.REACT_TO_MESSAGE;
const descendantReactToMessage =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.REACT_TO_MESSAGE;

const editMessagePermission = {
  title: 'Edit messages',
  description: 'Allows members to edit their sent messages',
};
const editMessage = threadPermissions.EDIT_MESSAGE;
const descendantEditMessage =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.EDIT_MESSAGE;

const manageInviteLinksPermission = {
  title: 'Manage invite links',
  description: 'Allows members to create and delete invite links',
};
const manageInviteLinks = threadPermissions.MANAGE_INVITE_LINKS;
const descendantManageInviteLinks =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.MANAGE_INVITE_LINKS;

export type ConfigurableCommunityPermissionOption = {
  title: string,
  description: string,
};
type ConfigurableCommunityPermission = {
  [permission: string]: ConfigurableCommunityPermissionOption,
};

export const configurableCommunityPermissions: ConfigurableCommunityPermission =
  Object.freeze({
    [editEntries]: calendarEditPermission,
    [descendantEditEntries]: calendarEditPermission,
    [descendantKnowOf]: secretChannelsPermission,
    [descendantVisible]: secretChannelsPermission,
    [voiced]: voicedPermission,
    [editThreadName]: createAndEditChannelsPermission,
    [descendantEditThreadName]: createAndEditChannelsPermission,
    [editThreadDescription]: createAndEditChannelsPermission,
    [descendantEditThreadDescription]: createAndEditChannelsPermission,
    [editThreadColor]: createAndEditChannelsPermission,
    [descendantEditThreadColor]: createAndEditChannelsPermission,
    [createSubchannels]: createAndEditChannelsPermission,
    [descendantCreateSubchannels]: createAndEditChannelsPermission,
    [editThreadAvatar]: createAndEditChannelsPermission,
    [descendantEditThreadAvatar]: createAndEditChannelsPermission,
    [deleteThread]: deleteChannelsPermission,
    [descendantDeleteThread]: deleteChannelsPermission,
    [addMembers]: addMembersPermission,
    [descendantAddMembers]: addMembersPermission,
    [removeMembers]: removeMembersPermission,
    [descendantRemoveMembers]: removeMembersPermission,
    [changeRole]: changeRolePermission,
    [descendantChangeRole]: changeRolePermission,
    [editPermissions]: editVisibilityPermission,
    [descendantEditPermissions]: editVisibilityPermission,
    [managePins]: managePinsPermission,
    [descendantManagePins]: managePinsPermission,
    [reactToMessage]: reactToMessagePermission,
    [descendantReactToMessage]: reactToMessagePermission,
    [editMessage]: editMessagePermission,
    [descendantEditMessage]: editMessagePermission,
    [manageInviteLinks]: manageInviteLinksPermission,
    [descendantManageInviteLinks]: manageInviteLinksPermission,
  });

export const configurableCommunityPermissionKeys: $ReadOnlySet<string> =
  new Set(Object.keys(configurableCommunityPermissions));
export const configurableCommunityPermissionsOptions: $ReadOnlySet<ConfigurableCommunityPermissionOption> =
  new Set(values(configurableCommunityPermissions));

export const guaranteedCommunityPermissions: $ReadOnlyArray<string> = [
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
