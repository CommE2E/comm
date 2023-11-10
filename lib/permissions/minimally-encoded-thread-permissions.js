// @flow

import invariant from 'invariant';
import _mapValues from 'lodash/fp/mapValues.js';
import t, { type TInterface } from 'tcomb';

import { parseThreadPermissionString } from './prefixes.js';
import type {
  ThreadPermission,
  ThreadPermissionInfo,
  ThreadPermissionsInfo,
  ThreadRolePermissionsBlob,
} from '../types/thread-permission-types.js';
import type {
  MemberInfo,
  RawThreadInfo,
  RoleInfo,
  ThreadCurrentUserInfo,
} from '../types/thread-types.js';
import {
  memberInfoValidator,
  rawThreadInfoValidator,
  roleInfoValidator,
  threadCurrentUserInfoValidator,
} from '../types/thread-types.js';
import { entries, invertObjectToMap } from '../utils/objects.js';
import { tBool, tID, tRegex, tShape } from '../utils/validation-utils.js';
import type { TRegex } from '../utils/validation-utils.js';

// `baseRolePermissionEncoding` maps permission names to indices.
// These indices represent the 6-bit basePermission part of the 10-bit role
// permission encoding created by `rolePermissionToBitmaskHex`.
// The 6-bit basePermission allows for up to 2^6 = 64 different permissions.
// If more than 64 permissions are needed, the encoding in
// `rolePermissionToBitmaskHex` will need to be updated to accommodate this.
const baseRolePermissionEncoding = Object.freeze({
  // TODO (atul): Update flow to `194.0.0` for bigint support
  // $FlowIssue bigint-unsupported
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
  invariant(
    // TODO (atul): Update flow to `194.0.0` for bigint support
    // $FlowIssue illegal-typeof
    typeof permissionBitmask === 'bigint',
    'permissionBitmask must be of type bigint',
  );
  return (permissionsBitmask & permissionBitmask) !== BigInt(0);
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

const inverseBaseRolePermissionEncoding = invertObjectToMap(
  baseRolePermissionEncoding,
);

// $FlowIssue bigint-unsupported
const inversePropagationPrefixes: Map<bigint, string> =
  invertObjectToMap(propagationPrefixes);

// $FlowIssue bigint-unsupported
const inverseFilterPrefixes: Map<bigint, string> =
  invertObjectToMap(filterPrefixes);

const decodeRolePermissionBitmask = (bitmask: string): string => {
  const bitmaskInt = BigInt(`0x${bitmask}`);
  const basePermission = (bitmaskInt >> BigInt(4)) & BigInt(63);
  const propagationPrefix = (bitmaskInt >> BigInt(2)) & BigInt(3);
  const filterPrefix = bitmaskInt & BigInt(3);

  const basePermissionString =
    inverseBaseRolePermissionEncoding.get(basePermission);
  const propagationPrefixString =
    inversePropagationPrefixes.get(propagationPrefix) ?? '';
  const filterPrefixString = inverseFilterPrefixes.get(filterPrefix) ?? '';

  invariant(
    basePermissionString !== null &&
      basePermissionString !== undefined &&
      propagationPrefixString !== null &&
      propagationPrefixString !== undefined &&
      filterPrefixString !== null &&
      filterPrefixString !== undefined,
    'invalid bitmask',
  );

  return `${propagationPrefixString}${filterPrefixString}${basePermissionString}`;
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

export type MinimallyEncodedRoleInfo = {
  ...RoleInfo,
  +permissions: $ReadOnlyArray<string>,
};

const tHexEncodedRolePermission: TRegex = tRegex(/^[0-9a-fA-F]{3,}$/);
const minimallyEncodedRoleInfoValidator: TInterface<MinimallyEncodedRoleInfo> =
  tShape<MinimallyEncodedRoleInfo>({
    ...roleInfoValidator.meta.props,
    permissions: t.list(tHexEncodedRolePermission),
  });

const minimallyEncodeRoleInfo = (
  roleInfo: RoleInfo,
): MinimallyEncodedRoleInfo => ({
  ...roleInfo,
  permissions: threadRolePermissionsBlobToBitmaskArray(roleInfo.permissions),
});

const decodeMinimallyEncodedRoleInfo = (
  minimallyEncodedRoleInfo: MinimallyEncodedRoleInfo,
): RoleInfo => ({
  ...minimallyEncodedRoleInfo,
  permissions: decodeThreadRolePermissionsBitmaskArray(
    minimallyEncodedRoleInfo.permissions,
  ),
});

export type MinimallyEncodedThreadCurrentUserInfo = {
  ...ThreadCurrentUserInfo,
  +permissions: string,
};

const tHexEncodedPermissionsBitmask: TRegex = tRegex(/^[0-9a-fA-F]+$/);
const minimallyEncodedThreadCurrentUserInfoValidator: TInterface<MinimallyEncodedThreadCurrentUserInfo> =
  tShape<MinimallyEncodedThreadCurrentUserInfo>({
    ...threadCurrentUserInfoValidator.meta.props,
    permissions: tHexEncodedPermissionsBitmask,
  });

const minimallyEncodeThreadCurrentUserInfo = (
  threadCurrentUserInfo: ThreadCurrentUserInfo,
): MinimallyEncodedThreadCurrentUserInfo => ({
  ...threadCurrentUserInfo,
  permissions: permissionsToBitmaskHex(threadCurrentUserInfo.permissions),
});

const decodeMinimallyEncodedThreadCurrentUserInfo = (
  minimallyEncodedThreadCurrentUserInfo: MinimallyEncodedThreadCurrentUserInfo,
): ThreadCurrentUserInfo => ({
  ...minimallyEncodedThreadCurrentUserInfo,
  permissions: threadPermissionsFromBitmaskHex(
    minimallyEncodedThreadCurrentUserInfo.permissions,
  ),
});

export type MinimallyEncodedMemberInfo = {
  ...MemberInfo,
  +permissions: string,
};

const minimallyEncodedMemberInfoValidator: TInterface<MinimallyEncodedMemberInfo> =
  tShape<MinimallyEncodedMemberInfo>({
    ...memberInfoValidator.meta.props,
    permissions: tHexEncodedPermissionsBitmask,
  });

const minimallyEncodeMemberInfo = (
  memberInfo: MemberInfo,
): MinimallyEncodedMemberInfo => ({
  ...memberInfo,
  permissions: permissionsToBitmaskHex(memberInfo.permissions),
});

const decodeMinimallyEncodedMemberInfo = (
  minimallyEncodedMemberInfo: MinimallyEncodedMemberInfo,
): MemberInfo => ({
  ...minimallyEncodedMemberInfo,
  permissions: threadPermissionsFromBitmaskHex(
    minimallyEncodedMemberInfo.permissions,
  ),
});

export type MinimallyEncodedRawThreadInfo = {
  minimallyEncoded: true,
  ...RawThreadInfo,
  +members: $ReadOnlyArray<MinimallyEncodedMemberInfo>,
  +roles: { +[id: string]: MinimallyEncodedRoleInfo },
  +currentUser: MinimallyEncodedThreadCurrentUserInfo,
};

const minimallyEncodedRawThreadInfoValidator: TInterface<MinimallyEncodedRawThreadInfo> =
  tShape<MinimallyEncodedRawThreadInfo>({
    minimallyEncoded: tBool(true),
    ...rawThreadInfoValidator.meta.props,
    members: t.list(minimallyEncodedMemberInfoValidator),
    roles: t.dict(tID, minimallyEncodedRoleInfoValidator),
    currentUser: minimallyEncodedThreadCurrentUserInfoValidator,
  });

const minimallyEncodeRawThreadInfo = (
  rawThreadInfo: RawThreadInfo,
): MinimallyEncodedRawThreadInfo => {
  const { members, roles, currentUser, ...rest } = rawThreadInfo;
  return {
    minimallyEncoded: true,
    ...rest,
    members: members.map(minimallyEncodeMemberInfo),
    roles: _mapValues(minimallyEncodeRoleInfo)(roles),
    currentUser: minimallyEncodeThreadCurrentUserInfo(currentUser),
  };
};

const decodeMinimallyEncodedRawThreadInfo = (
  minimallyEncodedRawThreadInfo: MinimallyEncodedRawThreadInfo,
): RawThreadInfo => {
  const { minimallyEncoded, members, roles, currentUser, ...rest } =
    minimallyEncodedRawThreadInfo;
  return {
    ...rest,
    members: members.map(decodeMinimallyEncodedMemberInfo),
    roles: _mapValues(decodeMinimallyEncodedRoleInfo)(roles),
    currentUser: decodeMinimallyEncodedThreadCurrentUserInfo(currentUser),
  };
};

export {
  permissionsToBitmaskHex,
  threadPermissionsFromBitmaskHex,
  hasPermission,
  rolePermissionToBitmaskHex,
  decodeRolePermissionBitmask,
  threadRolePermissionsBlobToBitmaskArray,
  decodeThreadRolePermissionsBitmaskArray,
  minimallyEncodedRoleInfoValidator,
  minimallyEncodedThreadCurrentUserInfoValidator,
  minimallyEncodedMemberInfoValidator,
  minimallyEncodedRawThreadInfoValidator,
  minimallyEncodeRawThreadInfo,
  decodeMinimallyEncodedRawThreadInfo,
};
