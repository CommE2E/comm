// @flow

import type {
  ThreadPermission,
  ThreadPermissionsInfo,
} from '../types/thread-permission-types.js';
import { entries } from '../utils/objects.js';

const minimallyEncodedThreadPermissions = Object.freeze({
  know_of: 0b1,
  membership: 0b10, // DEPRECATED
  visible: 0b100,
  voiced: 0b1000,
  edit_entries: 0b10000,
  edit_thread: 0b100000, // EDIT_THREAD_NAME
  edit_thread_description: 0b1000000,
  edit_thread_color: 0b10000000,
  delete_thread: 0b100000000,
  create_subthreads: 0b1000000000, // CREATE_SUBCHANNELS
  create_sidebars: 0b10000000000,
  join_thread: 0b100000000000,
  edit_permissions: 0b1000000000000,
  add_members: 0b10000000000000,
  remove_members: 0b100000000000000,
  change_role: 0b1000000000000000,
  leave_thread: 0b10000000000000000,
  react_to_message: 0b100000000000000000,
  edit_message: 0b1000000000000000000,
  edit_thread_avatar: 0b10000000000000000000,
  manage_pins: 0b100000000000000000000,
  manage_invite_links: 0b1000000000000000000000,
});

const permissionsToBitmask = (permissions: ThreadPermissionsInfo): number => {
  let bitmask = 0;
  for (const [key, permission] of entries(permissions)) {
    if (permission.value && key in minimallyEncodedThreadPermissions) {
      bitmask |= minimallyEncodedThreadPermissions[key];
    }
  }
  return bitmask;
};

const hasPermission = (
  permissionsBitmask: number,
  permission: ThreadPermission,
): boolean => {
  if (!(permission in minimallyEncodedThreadPermissions)) {
    return false;
  }
  const permissionBitmask = minimallyEncodedThreadPermissions[permission];
  return (permissionsBitmask & permissionBitmask) !== 0;
};

export {
  minimallyEncodedThreadPermissions,
  permissionsToBitmask,
  hasPermission,
};
