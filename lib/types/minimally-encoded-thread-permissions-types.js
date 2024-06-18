// @flow

import invariant from 'invariant';
import _mapValues from 'lodash/fp/mapValues.js';

import type { ClientAvatar } from './avatar-types.js';
import type { ThreadType } from './thread-types-enum.js';
import type {
  LegacyMemberInfo,
  LegacyRawThreadInfo,
  ClientLegacyRoleInfo,
  LegacyThreadCurrentUserInfo,
} from './thread-types.js';
import {
  decodeThreadRolePermissionsBitmaskArray,
  permissionsToBitmaskHex,
  threadPermissionsFromBitmaskHex,
  threadRolePermissionsBlobToBitmaskArray,
} from '../permissions/minimally-encoded-thread-permissions.js';
import type { SpecialRole } from '../permissions/special-roles.js';
import { specialRoles } from '../permissions/special-roles.js';
import { roleIsAdminRole, roleIsDefaultRole } from '../shared/thread-utils.js';
import type { ThreadEntity } from '../utils/entity-text.js';

type RoleInfoBase = $ReadOnly<{
  +id: string,
  +name: string,
  +minimallyEncoded: true,
  +permissions: $ReadOnlyArray<string>,
}>;

export type RoleInfo = $ReadOnly<{
  ...RoleInfoBase,
  +specialRole?: ?SpecialRole,
}>;

const minimallyEncodeRoleInfo = (roleInfo: ClientLegacyRoleInfo): RoleInfo => {
  invariant(
    !('minimallyEncoded' in roleInfo),
    'roleInfo is already minimally encoded.',
  );
  let specialRole: ?SpecialRole;
  if (roleIsDefaultRole(roleInfo)) {
    specialRole = specialRoles.DEFAULT_ROLE;
  } else if (roleIsAdminRole(roleInfo)) {
    specialRole = specialRoles.ADMIN_ROLE;
  }
  const { isDefault, ...rest } = roleInfo;
  return {
    ...rest,
    minimallyEncoded: true,
    permissions: threadRolePermissionsBlobToBitmaskArray(roleInfo.permissions),
    specialRole,
  };
};

const decodeMinimallyEncodedRoleInfo = (
  minimallyEncodedRoleInfo: RoleInfo,
): ClientLegacyRoleInfo => {
  const { minimallyEncoded, specialRole, ...rest } = minimallyEncodedRoleInfo;
  return {
    ...rest,
    permissions: decodeThreadRolePermissionsBitmaskArray(
      minimallyEncodedRoleInfo.permissions,
    ),
    isDefault: roleIsDefaultRole(minimallyEncodedRoleInfo),
  };
};

export type ThreadCurrentUserInfo = $ReadOnly<{
  ...LegacyThreadCurrentUserInfo,
  +minimallyEncoded: true,
  +permissions: string,
}>;

const minimallyEncodeThreadCurrentUserInfo = (
  threadCurrentUserInfo: LegacyThreadCurrentUserInfo,
): ThreadCurrentUserInfo => {
  invariant(
    !('minimallyEncoded' in threadCurrentUserInfo),
    'threadCurrentUserInfo is already minimally encoded.',
  );
  return {
    ...threadCurrentUserInfo,
    minimallyEncoded: true,
    permissions: permissionsToBitmaskHex(threadCurrentUserInfo.permissions),
  };
};

const decodeMinimallyEncodedThreadCurrentUserInfo = (
  minimallyEncodedThreadCurrentUserInfo: ThreadCurrentUserInfo,
): LegacyThreadCurrentUserInfo => {
  const { minimallyEncoded, ...rest } = minimallyEncodedThreadCurrentUserInfo;
  return {
    ...rest,
    permissions: threadPermissionsFromBitmaskHex(
      minimallyEncodedThreadCurrentUserInfo.permissions,
    ),
  };
};

export type MemberInfoWithPermissions = $ReadOnly<{
  ...LegacyMemberInfo,
  +minimallyEncoded: true,
  +permissions: string,
}>;

export type MemberInfoSansPermissions = $Diff<
  MemberInfoWithPermissions,
  { +permissions: string },
>;

function stripPermissionsFromMemberInfo(
  memberInfo: MemberInfoWithPermissions,
): MemberInfoSansPermissions {
  const { permissions, ...rest } = memberInfo;
  return rest;
}

const minimallyEncodeMemberInfo = (
  memberInfo: LegacyMemberInfo,
): MemberInfoWithPermissions => {
  invariant(
    !('minimallyEncoded' in memberInfo),
    'memberInfo is already minimally encoded.',
  );
  return {
    ...memberInfo,
    minimallyEncoded: true,
    permissions: permissionsToBitmaskHex(memberInfo.permissions),
  };
};

const decodeMinimallyEncodedMemberInfo = (
  minimallyEncodedMemberInfo: MemberInfoWithPermissions,
): LegacyMemberInfo => {
  const { minimallyEncoded, ...rest } = minimallyEncodedMemberInfo;
  return {
    ...rest,
    permissions: threadPermissionsFromBitmaskHex(
      minimallyEncodedMemberInfo.permissions,
    ),
  };
};

export type RelativeMemberInfo = {
  +id: string,
  +role: ?string,
  +isSender: boolean,
  +minimallyEncoded: true,
  +username: ?string,
  +isViewer: boolean,
};

export type RawThreadInfo = $ReadOnly<{
  ...LegacyRawThreadInfo,
  +minimallyEncoded: true,
  +members: $ReadOnlyArray<MemberInfoWithPermissions>,
  +roles: { +[id: string]: RoleInfo },
  +currentUser: ThreadCurrentUserInfo,
}>;

const minimallyEncodeRawThreadInfo = (
  rawThreadInfo: LegacyRawThreadInfo,
): RawThreadInfo => {
  invariant(
    !('minimallyEncoded' in rawThreadInfo),
    'rawThreadInfo is already minimally encoded.',
  );
  const { members, roles, currentUser, ...rest } = rawThreadInfo;
  return {
    ...rest,
    minimallyEncoded: true,
    members: members.map(minimallyEncodeMemberInfo),
    roles: _mapValues(minimallyEncodeRoleInfo)(roles),
    currentUser: minimallyEncodeThreadCurrentUserInfo(currentUser),
  };
};

const decodeMinimallyEncodedRawThreadInfo = (
  minimallyEncodedRawThreadInfo: RawThreadInfo,
): LegacyRawThreadInfo => {
  const { minimallyEncoded, members, roles, currentUser, ...rest } =
    minimallyEncodedRawThreadInfo;
  return {
    ...rest,
    members: members.map(decodeMinimallyEncodedMemberInfo),
    roles: _mapValues(decodeMinimallyEncodedRoleInfo)(roles),
    currentUser: decodeMinimallyEncodedThreadCurrentUserInfo(currentUser),
  };
};

export type RoleInfoWithoutSpecialRole = $ReadOnly<{
  ...RoleInfoBase,
  +isDefault?: boolean,
}>;

export type RawThreadInfoWithoutSpecialRole = $ReadOnly<{
  ...RawThreadInfo,
  +roles: { +[id: string]: RoleInfoWithoutSpecialRole },
}>;

export type ThreadInfo = $ReadOnly<{
  +minimallyEncoded: true,
  +id: string,
  +type: ThreadType,
  +name: ?string,
  +uiName: string | ThreadEntity,
  +avatar?: ?ClientAvatar,
  +description: ?string,
  +color: string, // hex, without "#" or "0x"
  +creationTime: number, // millisecond timestamp
  +parentThreadID: ?string,
  +containingThreadID: ?string,
  +community: ?string,
  +members: $ReadOnlyArray<RelativeMemberInfo>,
  +roles: { +[id: string]: RoleInfo },
  +currentUser: ThreadCurrentUserInfo,
  +sourceMessageID?: string,
  +repliesCount: number,
  +pinnedCount?: number,
}>;

export type ResolvedThreadInfo = $ReadOnly<{
  ...ThreadInfo,
  +uiName: string,
}>;

export {
  minimallyEncodeRoleInfo,
  decodeMinimallyEncodedRoleInfo,
  minimallyEncodeThreadCurrentUserInfo,
  decodeMinimallyEncodedThreadCurrentUserInfo,
  stripPermissionsFromMemberInfo,
  minimallyEncodeMemberInfo,
  decodeMinimallyEncodedMemberInfo,
  minimallyEncodeRawThreadInfo,
  decodeMinimallyEncodedRawThreadInfo,
};
