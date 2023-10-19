// @flow

import invariant from 'invariant';

import type {
  ThreadPermission,
  ThreadPermissionsInfo,
} from '../types/thread-permission-types.js';
import { entries } from '../utils/objects.js';

const minimallyEncodedThreadPermissions = Object.freeze({
  // TODO (atul): Update flow to `194.0.0` for bigint support
  // $FlowIssue bigint-unsupported
  know_of: BigInt(1) << BigInt(0),
  membership: BigInt(1) << BigInt(1), // DEPRECATED
  visible: BigInt(1) << BigInt(2),
  voiced: BigInt(1) << BigInt(3),
  edit_entries: BigInt(1) << BigInt(4),
  edit_thread: BigInt(1) << BigInt(5), // EDIT_THREAD_NAME
  edit_thread_description: BigInt(1) << BigInt(6),
  edit_thread_color: BigInt(1) << BigInt(7),
  delete_thread: BigInt(1) << BigInt(8),
  create_subthreads: BigInt(1) << BigInt(9), // CREATE_SUBCHANNELS
  create_sidebars: BigInt(1) << BigInt(10),
  join_thread: BigInt(1) << BigInt(11),
  edit_permissions: BigInt(1) << BigInt(12),
  add_members: BigInt(1) << BigInt(13),
  remove_members: BigInt(1) << BigInt(14),
  change_role: BigInt(1) << BigInt(15),
  leave_thread: BigInt(1) << BigInt(16),
  react_to_message: BigInt(1) << BigInt(17),
  edit_message: BigInt(1) << BigInt(18),
  edit_thread_avatar: BigInt(1) << BigInt(19),
  manage_pins: BigInt(1) << BigInt(20),
  manage_invite_links: BigInt(1) << BigInt(21),
});

// TODO (atul): Update flow to `194.0.0` for bigint support
// $FlowIssue bigint-unsupported
const permissionsToBitmask = (permissions: ThreadPermissionsInfo): bigint => {
  let bitmask = BigInt(0);
  for (const [key, permission] of entries(permissions)) {
    if (permission.value && key in minimallyEncodedThreadPermissions) {
      invariant(
        // TODO (atul): Update flow to `194.0.0` for bigint support
        // $FlowIssue illegal-typeof
        typeof minimallyEncodedThreadPermissions[key] === 'bigint',
        'must be bigint',
      );
      bitmask |= minimallyEncodedThreadPermissions[key];
    }
  }
  return bitmask;
};

const hasPermission = (
  // TODO (atul): Update flow to `194.0.0` for bigint support
  // $FlowIssue bigint-unsupported
  permissionsBitmask: bigint,
  permission: ThreadPermission,
): boolean => {
  if (!(permission in minimallyEncodedThreadPermissions)) {
    return false;
  }
  const permissionBitmask = minimallyEncodedThreadPermissions[permission];
  invariant(
    // TODO (atul): Update flow to `194.0.0` for bigint support
    // $FlowIssue illegal-typeof
    typeof permissionBitmask === 'bigint',
    'permissionBitmask must be of type bigint',
  );
  return (permissionsBitmask & permissionBitmask) !== BigInt(0);
};

export {
  minimallyEncodedThreadPermissions,
  permissionsToBitmask,
  hasPermission,
};
