// @flow

import invariant from 'invariant';

import {
  parseThreadPermissionString,
  constructThreadPermissionString,
} from './prefixes.js';
import {
  type ThreadPermission,
  type ThreadPermissionInfo,
  type ThreadPermissionsInfo,
  type ThreadRolePermissionsBlob,
  threadPermissions,
  assertThreadPermission,
  assertThreadPermissionPropagationPrefix,
  assertThreadPermissionFilterPrefix,
  assertThreadPermissionMembershipPrefix,
} from '../types/thread-permission-types.js';
import { entries, invertObjectToMap } from '../utils/objects.js';
import type { TRegex } from '../utils/validation-utils.js';
import { tRegex } from '../utils/validation-utils.js';

// `baseRolePermissionEncoding` maps permission names to indices.
// These indices represent the 6-bit basePermission part of the 10-bit role
// permission encoding created by `rolePermissionToBitmaskHex`.
// The 6-bit basePermission allows for up to 2^6 = 64 different permissions.
// If more than 64 permissions are needed, the encoding in
// `rolePermissionToBitmaskHex` will need to be updated to accommodate this.
const baseRolePermissionEncoding = Object.freeze({
  know_of: BigInt(0),
  visible: BigInt(1),
  voiced: BigInt(2),
  edit_entries: BigInt(3),
  edit_thread: BigInt(4), // EDIT_THREAD_NAME
  edit_thread_description: BigInt(5),
  edit_thread_color: BigInt(6),
  delete_thread: BigInt(7),
  create_subthreads: BigInt(8), // CREATE_SUBCHANNELS
  create_sidebars: BigInt(9),
  join_thread: BigInt(10),
  edit_permissions: BigInt(11),
  add_members: BigInt(12),
  remove_members: BigInt(13),
  change_role: BigInt(14),
  leave_thread: BigInt(15),
  react_to_message: BigInt(16),
  edit_message: BigInt(17),
  edit_thread_avatar: BigInt(18),
  manage_pins: BigInt(19),
  manage_invite_links: BigInt(20),
  voiced_in_announcement_channels: BigInt(21),
  manage_farcaster_channel_tags: BigInt(22),
  delete_own_messages: BigInt(23),
  delete_all_messages: BigInt(24),
});

// `minimallyEncodedThreadPermissions` is used to map each permission
// to its respective bitmask where the index from `baseRolePermissionEncoding`
// is used to set a specific bit in the bitmask. This is used in the
// `permissionsToBitmaskHex` function where each permission is represented as a
// single bit and the final bitmask is the union of all granted permissions.
const minimallyEncodedThreadPermissions = Object.fromEntries(
  Object.keys(baseRolePermissionEncoding).map((key, idx) => [
    key,
    BigInt(1) << BigInt(idx),
  ]),
);

// This function converts a set of permissions to a hex-encoded bitmask.
// Each permission is represented as a single bit in the bitmask.
const permissionsToBitmaskHex = (
  permissions: ThreadPermissionsInfo,
): string => {
  let bitmask = BigInt(0);
  for (const [key, permission] of entries(permissions)) {
    if (permission.value && key in minimallyEncodedThreadPermissions) {
      invariant(
        typeof minimallyEncodedThreadPermissions[key] === 'bigint',
        'must be bigint',
      );
      bitmask |= minimallyEncodedThreadPermissions[key];
    }
  }
  return bitmask.toString(16);
};

const tHexEncodedPermissionsBitmask: TRegex = tRegex(/^[0-9a-fA-F]+$/);
const threadPermissionsFromBitmaskHex = (
  permissionsBitmaskHex: string,
): ThreadPermissionsInfo => {
  invariant(
    tHexEncodedPermissionsBitmask.is(permissionsBitmaskHex),
    'permissionsBitmaskHex must be valid hex string.',
  );

  const permissionsBitmask = BigInt(`0x${permissionsBitmaskHex}`);
  const permissions: { [permission: ThreadPermission]: ThreadPermissionInfo } =
    {};

  for (const [key, permissionBitmask] of entries(
    minimallyEncodedThreadPermissions,
  )) {
    if ((permissionsBitmask & permissionBitmask) !== BigInt(0)) {
      permissions[key] = { value: true, source: 'null' };
    } else {
      permissions[key] = { value: false, source: null };
    }
  }
  return permissions;
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
  const knowOfBitmask =
    minimallyEncodedThreadPermissions[threadPermissions.KNOW_OF];
  invariant(
    typeof permissionBitmask === 'bigint',
    'permissionBitmask must be of type bigint',
  );
  return (
    (permissionsBitmask & permissionBitmask) !== BigInt(0) &&
    (permissionsBitmask & knowOfBitmask) !== BigInt(0)
  );
};

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
const membershipPrefixes = Object.freeze({
  '': BigInt(0),
  'member_': BigInt(1),
});

// Role Permission Bitmask Structure
// [10 9 8 7 6 5 4 3 2 1 0] - bit positions
// [m  b b b b b b p p f f] - symbol representation
// m = membershipPrefix  (1 bit)
// b = basePermission    (6 bits)
// p = propagationPrefix (2 bits)
// f = filterPrefix      (2 bits)
// membershipPrefix appears at the start because it was added later,
// and we wanted to maintain backwards compatibility
const rolePermissionToBitmaskHex = (threadRolePermission: string): string => {
  const parsed = parseThreadPermissionString(threadRolePermission);
  const basePermissionBits =
    baseRolePermissionEncoding[parsed.permission] & BigInt(63);
  const propagationPrefixBits =
    propagationPrefixes[parsed.propagationPrefix ?? ''] & BigInt(3);
  const filterPrefixBits =
    filterPrefixes[parsed.filterPrefix ?? ''] & BigInt(3);
  const membershipPrefixesBits =
    membershipPrefixes[parsed.membershipPrefix ?? ''] & BigInt(1);

  const bitmask =
    (membershipPrefixesBits << BigInt(10)) |
    (basePermissionBits << BigInt(4)) |
    (propagationPrefixBits << BigInt(2)) |
    filterPrefixBits;

  return bitmask.toString(16).padStart(3, '0');
};

const inverseBaseRolePermissionEncoding = invertObjectToMap(
  baseRolePermissionEncoding,
);

const inversePropagationPrefixes: Map<bigint, string> =
  invertObjectToMap(propagationPrefixes);

const inverseFilterPrefixes: Map<bigint, string> =
  invertObjectToMap(filterPrefixes);

const inverseMembershipPrefixes: Map<bigint, string> =
  invertObjectToMap(membershipPrefixes);

const tHexEncodedRolePermission: TRegex = tRegex(/^[0-9a-fA-F]{3,}$/);
const decodeRolePermissionBitmask = (bitmask: string): string => {
  const bitmaskInt = BigInt(`0x${bitmask}`);

  const basePermissionBits = (bitmaskInt >> BigInt(4)) & BigInt(63);
  const permissionString =
    inverseBaseRolePermissionEncoding.get(basePermissionBits);
  invariant(
    permissionString !== null && permissionString !== undefined,
    'invalid bitmask',
  );
  const permission = assertThreadPermission(permissionString);

  const propagationPrefixBits = (bitmaskInt >> BigInt(2)) & BigInt(3);
  const propagationPrefixString = inversePropagationPrefixes.get(
    propagationPrefixBits,
  );
  const propagationPrefix = propagationPrefixString
    ? assertThreadPermissionPropagationPrefix(propagationPrefixString)
    : undefined;

  const filterPrefixBits = bitmaskInt & BigInt(3);
  const filterPrefixString = inverseFilterPrefixes.get(filterPrefixBits);
  const filterPrefix = filterPrefixString
    ? assertThreadPermissionFilterPrefix(filterPrefixString)
    : undefined;

  const membershipPrefixBits = (bitmaskInt >> BigInt(10)) & BigInt(1);
  const membershipPrefixString =
    inverseMembershipPrefixes.get(membershipPrefixBits);
  const membershipPrefix = membershipPrefixString
    ? assertThreadPermissionMembershipPrefix(membershipPrefixString)
    : undefined;

  return constructThreadPermissionString({
    permission,
    propagationPrefix,
    filterPrefix,
    membershipPrefix,
  });
};

const threadRolePermissionsBlobToBitmaskArray = (
  threadRolePermissionsBlob: ThreadRolePermissionsBlob,
): $ReadOnlyArray<string> =>
  Object.keys(threadRolePermissionsBlob).map(rolePermissionToBitmaskHex);

const decodeThreadRolePermissionsBitmaskArray = (
  threadRolePermissionsBitmaskArray: $ReadOnlyArray<string>,
): ThreadRolePermissionsBlob =>
  Object.fromEntries(
    threadRolePermissionsBitmaskArray.map(bitmask => [
      decodeRolePermissionBitmask(bitmask),
      true,
    ]),
  );

export {
  permissionsToBitmaskHex,
  threadPermissionsFromBitmaskHex,
  hasPermission,
  rolePermissionToBitmaskHex,
  decodeRolePermissionBitmask,
  threadRolePermissionsBlobToBitmaskArray,
  decodeThreadRolePermissionsBitmaskArray,
  tHexEncodedRolePermission,
  tHexEncodedPermissionsBitmask,
};
