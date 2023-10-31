// @flow

import invariant from 'invariant';

import { parseThreadPermissionString } from './prefixes.js';
import type { ParsedThreadPermissionString } from './prefixes.js';
import type {
  ThreadPermission,
  ThreadPermissionsInfo,
  ThreadRolePermissionsBlob,
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

const permissionVariantBit = Object.freeze({
  '': BigInt(1) << BigInt(0),
  'descendant_': BigInt(1) << BigInt(1),
  'child_': BigInt(1) << BigInt(2),
  'open_': BigInt(1) << BigInt(3),
  'toplevel_': BigInt(1) << BigInt(4),
  'opentoplevel_': BigInt(1) << BigInt(5),
  'descendant_open_': BigInt(1) << BigInt(6),
  'descendant_toplevel_': BigInt(1) << BigInt(7),
  'descendant_opentoplevel_': BigInt(1) << BigInt(8),
  'child_open_': BigInt(1) << BigInt(9),
  'child_toplevel_': BigInt(1) << BigInt(10),
  'child_opentoplevel_': BigInt(1) << BigInt(11),
});

const rolePermissionToBitmask = (
  parsedPermissionString: ParsedThreadPermissionString,
): // TODO (atul): Update flow to `194.0.0` for bigint support
// $FlowIssue bigint-unsupported
bigint => {
  const { propagationPrefix, filterPrefix } = parsedPermissionString;
  const lookupKey = `${propagationPrefix ?? ''}${filterPrefix ?? ''}`;
  invariant(
    lookupKey in permissionVariantBit,
    `lookupKey must be in permissionVariantBit`,
  );
  return permissionVariantBit[lookupKey];
};

const rolePermissionsToBitmaskHex = (
  threadRolePermissions: ThreadRolePermissionsBlob,
): string => {
  // TODO (atul): Update flow to `194.0.0` for bigint support
  // $FlowIssue bigint-unsupported
  const permissionsMap = new Map<ThreadPermission, bigint>();
  for (const permission of Object.keys(threadRolePermissions)) {
    const parsed = parseThreadPermissionString(permission);
    permissionsMap.set(
      parsed.permission,
      (permissionsMap.get(parsed.permission) ?? BigInt(0)) |
        BigInt(rolePermissionToBitmask(parsed)),
    );
  }

  let bitmask = BigInt(0);
  Object.keys(minimallyEncodedThreadPermissions).forEach((permission, idx) => {
    let permissionBitmask = permissionsMap.get(permission) ?? BigInt(0);
    permissionBitmask <<= BigInt(idx) * BigInt(12);
    bitmask |= permissionBitmask;
  });

  return bitmask.toString(16);
};

// TODO (atul): Update flow to `194.0.0` for bigint support
// $FlowIssue bigint-unsupported
const inversePermissionVariantBit: Map<bigint, string> = new Map(
  Object.entries(permissionVariantBit).map(([key, value]) => [value, key]),
);

const bitmaskHexToRolePermissions = (
  bitmaskHex: string,
): ThreadRolePermissionsBlob => {
  const bitmask = BigInt(`0x${bitmaskHex}`);
  const threadRolePermissions = {};

  Object.keys(minimallyEncodedThreadPermissions).forEach((permission, idx) => {
    // Extract 12-bit segment for this permission
    const shiftAmount = BigInt(idx) * BigInt(12);
    // `& BigInt('0xfff')` masks all but lowest 12 bits
    const permissionBitmask = (bitmask >> shiftAmount) & BigInt('0xfff');

    inversePermissionVariantBit.forEach((value, key) => {
      if ((permissionBitmask & key) === key) {
        threadRolePermissions[`${value}${permission}`] = true;
      }
    });
  });

  return threadRolePermissions;
};

export {
  minimallyEncodedThreadPermissions,
  permissionsToBitmaskHex,
  hasPermission,
  rolePermissionToBitmask,
  rolePermissionsToBitmaskHex,
  bitmaskHexToRolePermissions,
};
