// @flow

import invariant from 'invariant';
import t, { type TDict, type TUnion, type TEnums } from 'tcomb';

import { values } from '../utils/objects.js';
import { tBool, tShape, tID } from '../utils/validation-utils.js';

// When a new permission is added, if it should be configurable for a role, it
// should be either added to an existing set or a new set alongside a
// new user-facing permission. If it is a permission that should be ensured
// across all roles, it should be added to `universalCommunityPermissions`.
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

// These are the set of user-facing permissions that we display as configurable
// to the user when they are creating a custom role for their given community.
// They are per-community rather than per-thread, so when configured they are
// to be expected to be propagated across the community. Also notably,
// `threadPermissions` is used on the keyserver for permission checks to
// validate actions, but these `userSurfacedPermissions` are only used
// on the client for the UI and propagated to the server. The
// `configurableCommunityPermissions` mapping below is the association between
// each userSurfacedPermission and a set of threadPermissions.
export const userSurfacedPermissions = Object.freeze({
  EDIT_CALENDAR: 'edit_calendar',
  KNOW_OF_SECRET_CHANNELS: 'know_of_secret_channels',
  VOICED_IN_ANNOUNCEMENT_CHANNELS: 'voiced_in_announcement_channels',
  CREATE_AND_EDIT_CHANNELS: 'create_and_edit_channels',
  DELETE_CHANNELS: 'delete_channels',
  ADD_MEMBERS: 'add_members',
  REMOVE_MEMBERS: 'remove_members',
  CHANGE_ROLES: 'change_roles',
  EDIT_VISIBILITY: 'edit_visibility',
  MANAGE_PINS: 'manage_pins',
  REACT_TO_MESSAGES: 'react_to_messages',
  EDIT_MESSAGES: 'edit_messages',
  MANAGE_INVITE_LINKS: 'manage_invite_links',
});
export type UserSurfacedPermission = $Values<typeof userSurfacedPermissions>;
export const userSurfacedPermissionsSet: $ReadOnlySet<UserSurfacedPermission> =
  new Set(values(userSurfacedPermissions));
export const userSurfacedPermissionValidator: TEnums = t.enums.of(
  values(userSurfacedPermissions),
);

const editCalendarPermission = {
  title: 'Edit calendar',
  description: 'Allows members to edit the community calendar',
  userSurfacedPermission: userSurfacedPermissions.EDIT_CALENDAR,
};
const editEntries = threadPermissions.EDIT_ENTRIES;
const descendantEditEntries =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.EDIT_ENTRIES;
const editCalendarPermissions = new Set([editEntries, descendantEditEntries]);

const knowOfSecretChannelsPermission = {
  title: 'Know of secret channels',
  description: 'Allows members to know of all secret channels',
  userSurfacedPermission: userSurfacedPermissions.KNOW_OF_SECRET_CHANNELS,
};
const descendantKnowOf =
  threadPermissionPropagationPrefixes.DESCENDANT + threadPermissions.KNOW_OF;
const descendantVisible =
  threadPermissionPropagationPrefixes.DESCENDANT + threadPermissions.VISIBLE;
const descendantTopLevelJoinThread =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissionFilterPrefixes.TOP_LEVEL +
  threadPermissions.JOIN_THREAD;
const descendantJoinThread =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.JOIN_THREAD;
const childJoinThread =
  threadPermissionPropagationPrefixes.CHILD + threadPermissions.JOIN_THREAD;
const knowOfSecretChannelsPermissions = new Set([
  descendantKnowOf,
  descendantVisible,
  descendantTopLevelJoinThread,
  descendantJoinThread,
  childJoinThread,
]);

const voicedPermission = {
  title: 'Voiced in announcement channels',
  description: 'Allows members to send messages in announcement channels',
  userSurfacedPermission:
    userSurfacedPermissions.VOICED_IN_ANNOUNCEMENT_CHANNELS,
};
const voiced = threadPermissions.VOICED;
const voicedPermissions = new Set([voiced]);

const createAndEditChannelsPermission = {
  title: 'Create and edit channels',
  description: 'Allows members to create new and edit existing channels',
  userSurfacedPermission: userSurfacedPermissions.CREATE_AND_EDIT_CHANNELS,
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
const descendantTopLevelCreateSidebars =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissionFilterPrefixes.TOP_LEVEL +
  threadPermissions.CREATE_SIDEBARS;
const createAndEditChannelsPermissions = new Set([
  editThreadName,
  descendantEditThreadName,
  editThreadDescription,
  descendantEditThreadDescription,
  editThreadColor,
  descendantEditThreadColor,
  createSubchannels,
  descendantCreateSubchannels,
  editThreadAvatar,
  descendantEditThreadAvatar,
  descendantTopLevelCreateSidebars,
]);

const deleteChannelsPermission = {
  title: 'Delete channels',
  description: 'Allows members to delete channels',
  userSurfacedPermission: userSurfacedPermissions.DELETE_CHANNELS,
};
const deleteThread = threadPermissions.DELETE_THREAD;
const descendantDeleteThread =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.DELETE_THREAD;
const deleteChannelsPermissions = new Set([
  deleteThread,
  descendantDeleteThread,
]);

const addMembersPermission = {
  title: 'Add members',
  description: 'Allows members to add other members to channels',
  userSurfacedPermission: userSurfacedPermissions.ADD_MEMBERS,
};
const addMembers = threadPermissions.ADD_MEMBERS;
const descendantAddMembers =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.ADD_MEMBERS;
const childOpenAddMembers =
  threadPermissionPropagationPrefixes.CHILD +
  threadPermissionFilterPrefixes.OPEN +
  threadPermissions.ADD_MEMBERS;
const addMembersPermissions = new Set([
  addMembers,
  descendantAddMembers,
  childOpenAddMembers,
]);

const removeMembersPermission = {
  title: 'Remove members',
  description: 'Allows members to remove anybody they can demote from channels',
  userSurfacedPermission: userSurfacedPermissions.REMOVE_MEMBERS,
};
const removeMembers = threadPermissions.REMOVE_MEMBERS;
const descendantRemoveMembers =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.REMOVE_MEMBERS;
const removeMembersPermissions = new Set([
  removeMembers,
  descendantRemoveMembers,
]);

const changeRolePermission = {
  title: 'Change roles',
  description: 'Allows members to promote and demote other members',
  userSurfacedPermission: userSurfacedPermissions.CHANGE_ROLES,
};
const changeRole = threadPermissions.CHANGE_ROLE;
const descendantChangeRole =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.CHANGE_ROLE;
const changeRolePermissions = new Set([changeRole, descendantChangeRole]);

const editVisibilityPermission = {
  title: 'Edit visibility',
  description: 'Allows members to edit visibility permissions of channels',
  userSurfacedPermission: userSurfacedPermissions.EDIT_VISIBILITY,
};
const editPermissions = threadPermissions.EDIT_PERMISSIONS;
const descendantEditPermissions =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.EDIT_PERMISSIONS;
const editVisibilityPermissions = new Set([
  editPermissions,
  descendantEditPermissions,
]);

const managePinsPermission = {
  title: 'Manage pins',
  description: 'Allows members to pin or unpin messages in channels',
  userSurfacedPermission: userSurfacedPermissions.MANAGE_PINS,
};
const managePins = threadPermissions.MANAGE_PINS;
const descendantManagePins =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.MANAGE_PINS;
const managePinsPermissions = new Set([managePins, descendantManagePins]);

const reactToMessagePermission = {
  title: 'React to messages',
  description: 'Allows members to add reactions to messages',
  userSurfacedPermission: userSurfacedPermissions.REACT_TO_MESSAGES,
};
const reactToMessage = threadPermissions.REACT_TO_MESSAGE;
const descendantReactToMessage =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.REACT_TO_MESSAGE;
const reactToMessagePermissions = new Set([
  reactToMessage,
  descendantReactToMessage,
]);

const editMessagePermission = {
  title: 'Edit messages',
  description: 'Allows members to edit their sent messages',
  userSurfacedPermission: userSurfacedPermissions.EDIT_MESSAGES,
};
const editMessage = threadPermissions.EDIT_MESSAGE;
const descendantEditMessage =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.EDIT_MESSAGE;
const editMessagePermissions = new Set([editMessage, descendantEditMessage]);

const manageInviteLinksPermission = {
  title: 'Manage invite links',
  description: 'Allows members to create and delete invite links',
  userSurfacedPermission: userSurfacedPermissions.MANAGE_INVITE_LINKS,
};
const manageInviteLinks = threadPermissions.MANAGE_INVITE_LINKS;
const descendantManageInviteLinks =
  threadPermissionPropagationPrefixes.DESCENDANT +
  threadPermissions.MANAGE_INVITE_LINKS;
const manageInviteLinksPermissions = new Set([
  manageInviteLinks,
  descendantManageInviteLinks,
]);

export type UserSurfacedPermissionOption = {
  +title: string,
  +description: string,
  +userSurfacedPermission: UserSurfacedPermission,
};
export const userSurfacedPermissionOptions: $ReadOnlySet<UserSurfacedPermissionOption> =
  new Set([
    editCalendarPermission,
    knowOfSecretChannelsPermission,
    voicedPermission,
    createAndEditChannelsPermission,
    deleteChannelsPermission,
    addMembersPermission,
    removeMembersPermission,
    changeRolePermission,
    editVisibilityPermission,
    managePinsPermission,
    reactToMessagePermission,
    editMessagePermission,
    manageInviteLinksPermission,
  ]);

type ConfigurableCommunityPermission = {
  +[permission: UserSurfacedPermission]: $ReadOnlySet<string>,
};
export const configurableCommunityPermissions: ConfigurableCommunityPermission =
  Object.freeze({
    [userSurfacedPermissions.EDIT_CALENDAR]: editCalendarPermissions,
    [userSurfacedPermissions.KNOW_OF_SECRET_CHANNELS]:
      knowOfSecretChannelsPermissions,
    [userSurfacedPermissions.VOICED_IN_ANNOUNCEMENT_CHANNELS]:
      voicedPermissions,
    [userSurfacedPermissions.CREATE_AND_EDIT_CHANNELS]:
      createAndEditChannelsPermissions,
    [userSurfacedPermissions.DELETE_CHANNELS]: deleteChannelsPermissions,
    [userSurfacedPermissions.ADD_MEMBERS]: addMembersPermissions,
    [userSurfacedPermissions.REMOVE_MEMBERS]: removeMembersPermissions,
    [userSurfacedPermissions.CHANGE_ROLES]: changeRolePermissions,
    [userSurfacedPermissions.EDIT_VISIBILITY]: editVisibilityPermissions,
    [userSurfacedPermissions.MANAGE_PINS]: managePinsPermissions,
    [userSurfacedPermissions.REACT_TO_MESSAGES]: reactToMessagePermissions,
    [userSurfacedPermissions.EDIT_MESSAGES]: editMessagePermissions,
    [userSurfacedPermissions.MANAGE_INVITE_LINKS]: manageInviteLinksPermissions,
  });

export const universalCommunityPermissions: $ReadOnlyArray<string> = [
  // know_of | descendant_open_know_of
  threadPermissions.KNOW_OF,
  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissionFilterPrefixes.OPEN +
    threadPermissions.KNOW_OF,

  // descendant_open_voiced
  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissionFilterPrefixes.OPEN +
    threadPermissions.VOICED,

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
