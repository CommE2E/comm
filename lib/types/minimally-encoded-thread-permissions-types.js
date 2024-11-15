// @flow

import invariant from 'invariant';
import _mapValues from 'lodash/fp/mapValues.js';

import type { ClientAvatar } from './avatar-types.js';
import type { ThreadPermissionsInfo } from './thread-permission-types.js';
import type { ThreadType } from './thread-types-enum.js';
import type {
  ClientLegacyRoleInfo,
  LegacyMemberInfo,
  LegacyRawThreadInfo,
  LegacyThickRawThreadInfo,
  LegacyThinRawThreadInfo,
  LegacyThreadCurrentUserInfo,
  ThickMemberInfo,
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

export type MinimallyEncodedThickMemberInfo = $ReadOnly<{
  ...ThickMemberInfo,
  +minimallyEncoded: true,
  +permissions: string,
}>;

const minimallyEncodeMemberInfo = <T: LegacyMemberInfo | ThickMemberInfo>(
  memberInfo: T,
): $ReadOnly<{
  ...T,
  +minimallyEncoded: true,
  +permissions: string,
}> => {
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

const decodeMinimallyEncodedMemberInfo = <
  T: MemberInfoWithPermissions | MinimallyEncodedThickMemberInfo,
>(
  minimallyEncodedMemberInfo: T,
): $ReadOnly<{
  ...$Diff<
    T,
    {
      +minimallyEncoded: true,
      +permissions: string,
    },
  >,
  +permissions: ThreadPermissionsInfo,
}> => {
  const { minimallyEncoded, ...rest } = minimallyEncodedMemberInfo;
  return {
    ...rest,
    permissions: threadPermissionsFromBitmaskHex(
      minimallyEncodedMemberInfo.permissions,
    ),
  };
};

export type ThinRawThreadInfo = $ReadOnly<{
  ...LegacyThinRawThreadInfo,
  +minimallyEncoded: true,
  +members: $ReadOnlyArray<MemberInfoSansPermissions>,
  +roles: { +[id: string]: RoleInfo },
  +currentUser: ThreadCurrentUserInfo,
}>;

export type ThickRawThreadInfo = $ReadOnly<{
  ...LegacyThickRawThreadInfo,
  +minimallyEncoded: true,
  +members: $ReadOnlyArray<MinimallyEncodedThickMemberInfo>,
  +roles: { +[id: string]: RoleInfo },
  +currentUser: ThreadCurrentUserInfo,
}>;

export type RawThreadInfo = ThinRawThreadInfo | ThickRawThreadInfo;

const minimallyEncodeRawThreadInfoWithMemberPermissions = (
  rawThreadInfo: LegacyRawThreadInfo,
): RawThreadInfo => {
  invariant(
    !('minimallyEncoded' in rawThreadInfo),
    'rawThreadInfo is already minimally encoded.',
  );
  if (rawThreadInfo.thick) {
    const { members, roles, currentUser, ...rest } = rawThreadInfo;
    return {
      ...rest,
      minimallyEncoded: true,
      members: members.map(minimallyEncodeMemberInfo),
      roles: _mapValues(minimallyEncodeRoleInfo)(roles),
      currentUser: minimallyEncodeThreadCurrentUserInfo(currentUser),
    };
  } else {
    const { members, roles, currentUser, ...rest } = rawThreadInfo;
    // We removed the `.permissions` field from `MemberInfo`, but persisted
    // `MemberInfo`s will still have the field in legacy migrations.
    // $FlowIgnore
    return {
      ...rest,
      minimallyEncoded: true,
      members: members.map(minimallyEncodeMemberInfo),
      roles: _mapValues(minimallyEncodeRoleInfo)(roles),
      currentUser: minimallyEncodeThreadCurrentUserInfo(currentUser),
    };
  }
};

const deprecatedDecodeMinimallyEncodedRawThreadInfo = (
  minimallyEncodedRawThreadInfo: RawThreadInfo,
): LegacyRawThreadInfo => {
  if (minimallyEncodedRawThreadInfo.thick) {
    const { minimallyEncoded, members, roles, currentUser, ...rest } =
      minimallyEncodedRawThreadInfo;
    return {
      ...rest,
      members: members.map(decodeMinimallyEncodedMemberInfo),
      roles: _mapValues(decodeMinimallyEncodedRoleInfo)(roles),
      currentUser: decodeMinimallyEncodedThreadCurrentUserInfo(currentUser),
    };
  } else {
    const { minimallyEncoded, members, roles, currentUser, ...rest } =
      minimallyEncodedRawThreadInfo;
    return {
      ...rest,
      // We removed the `.permissions` field from `MemberInfo`, but persisted
      // `MemberInfo`s will still have the field in legacy migrations.
      // $FlowIgnore
      members: members.map(decodeMinimallyEncodedMemberInfo),
      roles: _mapValues(decodeMinimallyEncodedRoleInfo)(roles),
      currentUser: decodeMinimallyEncodedThreadCurrentUserInfo(currentUser),
    };
  }
};

export type RoleInfoWithoutSpecialRole = $ReadOnly<{
  ...RoleInfoBase,
  +isDefault?: boolean,
}>;

export type ThinRawThreadInfoWithoutSpecialRole = $ReadOnly<{
  ...ThinRawThreadInfo,
  +roles: { +[id: string]: RoleInfoWithoutSpecialRole },
}>;

export type RelativeMemberInfo = {
  +id: string,
  +role: ?string,
  +isSender: boolean,
  +minimallyEncoded: true,
  +username: ?string,
  +isViewer: boolean,
};

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
  minimallyEncodeMemberInfo,
  decodeMinimallyEncodedMemberInfo,
  minimallyEncodeRawThreadInfoWithMemberPermissions,
  deprecatedDecodeMinimallyEncodedRawThreadInfo,
};
