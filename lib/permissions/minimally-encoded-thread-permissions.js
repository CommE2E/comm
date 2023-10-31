// @flow

import invariant from 'invariant';

import { parseThreadPermissionString } from './prefixes.js';
import type {
  ThreadPermission,
  ThreadPermissionsInfo,
} from '../types/thread-permission-types.js';
import { entries } from '../utils/objects.js';

const minimallyEncodedThreadPermissions = Object.freeze({
  // TODO (atul): Update flow to `194.0.0` for bigint support
  // $FlowIssue bigint-unsupported
  know_of: BigInt(1) << BigInt(0),
  visible: BigInt(1) << BigInt(1),
  voiced: BigInt(1) << BigInt(2),
  edit_entries: BigInt(1) << BigInt(3),
  edit_thread: BigInt(1) << BigInt(4), // EDIT_THREAD_NAME
  edit_thread_description: BigInt(1) << BigInt(5),
  edit_thread_color: BigInt(1) << BigInt(6),
  delete_thread: BigInt(1) << BigInt(7),
  create_subthreads: BigInt(1) << BigInt(8), // CREATE_SUBCHANNELS
  create_sidebars: BigInt(1) << BigInt(9),
  join_thread: BigInt(1) << BigInt(10),
  edit_permissions: BigInt(1) << BigInt(11),
  add_members: BigInt(1) << BigInt(12),
  remove_members: BigInt(1) << BigInt(13),
  change_role: BigInt(1) << BigInt(14),
  leave_thread: BigInt(1) << BigInt(15),
  react_to_message: BigInt(1) << BigInt(16),
  edit_message: BigInt(1) << BigInt(17),
  edit_thread_avatar: BigInt(1) << BigInt(18),
  manage_pins: BigInt(1) << BigInt(19),
  manage_invite_links: BigInt(1) << BigInt(20),
});

const permissionsToBitmaskHex = (
  permissions: ThreadPermissionsInfo,
): string => {
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
  return bitmask.toString(16);
};

const hasPermission = (
  permissionsBitmaskHex: string,
  permission: ThreadPermission,
): boolean => {
  const permissionsBitmask = BigInt(`0x${permissionsBitmaskHex}`);
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

const baseRolePermissionEncoding = Object.fromEntries(
  Object.keys(minimallyEncodedThreadPermissions).map((key, idx) => [
    key,
    BigInt(idx),
  ]),
);
const propagationPrefixes = Object.freeze({
  '': BigInt(0),
  'descendant_': BigInt(1),
  'child_': BigInt(2),
});
const filterPrefixes = Object.freeze({
  '': BigInt(0),
  'open_': BigInt(1),
  'toplevel_': BigInt(2),
  'opentoplevel_': BigInt(3),
});

// Role Permission Bitmask Structure
// [9 8 7 6 5 4 3 2 1 0] - bit positions
// [b b b b b b p p f f] - symbol representation
// b = basePermission    (6 bits)
// p = propagationPrefix (2 bits)
// f = filterPrefix      (2 bits)
const rolePermissionToBitmaskHex = (threadRolePermission: string): string => {
  const parsed = parseThreadPermissionString(threadRolePermission);
  const basePermissionBits =
    baseRolePermissionEncoding[parsed.permission] & BigInt(63);
  const propagationPrefixBits =
    propagationPrefixes[parsed.propagationPrefix ?? ''] & BigInt(3);
  const filterPrefixBits =
    filterPrefixes[parsed.filterPrefix ?? ''] & BigInt(3);

  const bitmask =
    (basePermissionBits << BigInt(4)) |
    (propagationPrefixBits << BigInt(2)) |
    filterPrefixBits;

  return bitmask.toString(16).padStart(3, '0');
};

export {
  minimallyEncodedThreadPermissions,
  permissionsToBitmaskHex,
  hasPermission,
  rolePermissionToBitmaskHex,
};
