// @flow

import _mapValues from 'lodash/fp/mapValues.js';
import type { TInterface } from 'tcomb';
import t from 'tcomb';

import {
  memberInfoValidator,
  rawThreadInfoValidator,
  roleInfoValidator,
  threadCurrentUserInfoValidator,
  threadInfoValidator,
} from './thread-types.js';
import type {
  MemberInfo,
  RawThreadInfo,
  RelativeMemberInfo,
  RoleInfo,
  ThreadCurrentUserInfo,
  ThreadInfo,
} from './thread-types.js';
import {
  decodeThreadRolePermissionsBitmaskArray,
  permissionsToBitmaskHex,
  threadPermissionsFromBitmaskHex,
  threadRolePermissionsBlobToBitmaskArray,
  tHexEncodedRolePermission,
  tHexEncodedPermissionsBitmask,
} from '../permissions/minimally-encoded-thread-permissions.js';
import { tBool, tID, tShape } from '../utils/validation-utils.js';

export type MinimallyEncodedRoleInfo = $ReadOnly<{
  ...RoleInfo,
  +minimallyEncoded: true,
  +permissions: $ReadOnlyArray<string>,
}>;

const minimallyEncodedRoleInfoValidator: TInterface<MinimallyEncodedRoleInfo> =
  tShape<MinimallyEncodedRoleInfo>({
    ...roleInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    permissions: t.list(tHexEncodedRolePermission),
  });

const minimallyEncodeRoleInfo = (
  roleInfo: RoleInfo,
): MinimallyEncodedRoleInfo => ({
  ...roleInfo,
  minimallyEncoded: true,
  permissions: threadRolePermissionsBlobToBitmaskArray(roleInfo.permissions),
});

const decodeMinimallyEncodedRoleInfo = (
  minimallyEncodedRoleInfo: MinimallyEncodedRoleInfo,
): RoleInfo => {
  const { minimallyEncoded, ...rest } = minimallyEncodedRoleInfo;
  return {
    ...rest,
    permissions: decodeThreadRolePermissionsBitmaskArray(
      minimallyEncodedRoleInfo.permissions,
    ),
  };
};

export type MinimallyEncodedThreadCurrentUserInfo = $ReadOnly<{
  ...ThreadCurrentUserInfo,
  +minimallyEncoded: true,
  +permissions: string,
}>;

const minimallyEncodedThreadCurrentUserInfoValidator: TInterface<MinimallyEncodedThreadCurrentUserInfo> =
  tShape<MinimallyEncodedThreadCurrentUserInfo>({
    ...threadCurrentUserInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    permissions: tHexEncodedPermissionsBitmask,
  });

const minimallyEncodeThreadCurrentUserInfo = (
  threadCurrentUserInfo: ThreadCurrentUserInfo,
): MinimallyEncodedThreadCurrentUserInfo => ({
  ...threadCurrentUserInfo,
  minimallyEncoded: true,
  permissions: permissionsToBitmaskHex(threadCurrentUserInfo.permissions),
});

const decodeMinimallyEncodedThreadCurrentUserInfo = (
  minimallyEncodedThreadCurrentUserInfo: MinimallyEncodedThreadCurrentUserInfo,
): ThreadCurrentUserInfo => {
  const { minimallyEncoded, ...rest } = minimallyEncodedThreadCurrentUserInfo;
  return {
    ...rest,
    permissions: threadPermissionsFromBitmaskHex(
      minimallyEncodedThreadCurrentUserInfo.permissions,
    ),
  };
};

export type MinimallyEncodedMemberInfo = $ReadOnly<{
  ...MemberInfo,
  +minimallyEncoded: true,
  +permissions: string,
}>;

const minimallyEncodedMemberInfoValidator: TInterface<MinimallyEncodedMemberInfo> =
  tShape<MinimallyEncodedMemberInfo>({
    ...memberInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    permissions: tHexEncodedPermissionsBitmask,
  });

const minimallyEncodeMemberInfo = (
  memberInfo: MemberInfo,
): MinimallyEncodedMemberInfo => ({
  ...memberInfo,
  minimallyEncoded: true,
  permissions: permissionsToBitmaskHex(memberInfo.permissions),
});

const decodeMinimallyEncodedMemberInfo = (
  minimallyEncodedMemberInfo: MinimallyEncodedMemberInfo,
): MemberInfo => {
  const { minimallyEncoded, ...rest } = minimallyEncodedMemberInfo;
  return {
    ...rest,
    permissions: threadPermissionsFromBitmaskHex(
      minimallyEncodedMemberInfo.permissions,
    ),
  };
};

export type MinimallyEncodedRelativeMemberInfo = $ReadOnly<{
  ...MinimallyEncodedMemberInfo,
  +username: ?string,
  +isViewer: boolean,
}>;

const minimallyEncodedRelativeMemberInfoValidator: TInterface<MinimallyEncodedRelativeMemberInfo> =
  tShape<MinimallyEncodedRelativeMemberInfo>({
    ...minimallyEncodedMemberInfoValidator.meta.props,
    username: t.maybe(t.String),
    isViewer: t.Boolean,
  });

const minimallyEncodeRelativeMemberInfo = (
  relativeMemberInfo: RelativeMemberInfo,
): MinimallyEncodedRelativeMemberInfo => ({
  ...relativeMemberInfo,
  minimallyEncoded: true,
  permissions: permissionsToBitmaskHex(relativeMemberInfo.permissions),
});

const decodeMinimallyEncodedRelativeMemberInfo = (
  minimallyEncodedRelativeMemberInfo: MinimallyEncodedRelativeMemberInfo,
): RelativeMemberInfo => {
  const { minimallyEncoded, ...rest } = minimallyEncodedRelativeMemberInfo;
  return {
    ...rest,
    permissions: threadPermissionsFromBitmaskHex(
      minimallyEncodedRelativeMemberInfo.permissions,
    ),
  };
};

export type MinimallyEncodedRawThreadInfo = $ReadOnly<{
  ...RawThreadInfo,
  +minimallyEncoded: true,
  +members: $ReadOnlyArray<MinimallyEncodedMemberInfo>,
  +roles: { +[id: string]: MinimallyEncodedRoleInfo },
  +currentUser: MinimallyEncodedThreadCurrentUserInfo,
}>;

const minimallyEncodedRawThreadInfoValidator: TInterface<MinimallyEncodedRawThreadInfo> =
  tShape<MinimallyEncodedRawThreadInfo>({
    ...rawThreadInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    members: t.list(minimallyEncodedMemberInfoValidator),
    roles: t.dict(tID, minimallyEncodedRoleInfoValidator),
    currentUser: minimallyEncodedThreadCurrentUserInfoValidator,
  });

const minimallyEncodeRawThreadInfo = (
  rawThreadInfo: RawThreadInfo,
): MinimallyEncodedRawThreadInfo => {
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

export type MinimallyEncodedThreadInfo = $ReadOnly<{
  ...ThreadInfo,
  +minimallyEncoded: true,
  +members: $ReadOnlyArray<MinimallyEncodedRelativeMemberInfo>,
  +roles: { +[id: string]: MinimallyEncodedRoleInfo },
  +currentUser: MinimallyEncodedThreadCurrentUserInfo,
}>;

const minimallyEncodedThreadInfoValidator: TInterface<MinimallyEncodedThreadInfo> =
  tShape<MinimallyEncodedThreadInfo>({
    ...threadInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    members: t.list(minimallyEncodedRelativeMemberInfoValidator),
    roles: t.dict(tID, minimallyEncodedRoleInfoValidator),
    currentUser: minimallyEncodedThreadCurrentUserInfoValidator,
  });

const minimallyEncodeThreadInfo = (
  threadInfo: ThreadInfo,
): MinimallyEncodedThreadInfo => {
  const { members, roles, currentUser, ...rest } = threadInfo;
  return {
    ...rest,
    minimallyEncoded: true,
    members: members.map(minimallyEncodeRelativeMemberInfo),
    roles: _mapValues(minimallyEncodeRoleInfo)(roles),
    currentUser: minimallyEncodeThreadCurrentUserInfo(currentUser),
  };
};

const decodeMinimallyEncodedThreadInfo = (
  minimallyEncodedThreadInfo: MinimallyEncodedThreadInfo,
): ThreadInfo => {
  const { minimallyEncoded, members, roles, currentUser, ...rest } =
    minimallyEncodedThreadInfo;
  return {
    ...rest,
    members: members.map(decodeMinimallyEncodedRelativeMemberInfo),
    roles: _mapValues(decodeMinimallyEncodedRoleInfo)(roles),
    currentUser: decodeMinimallyEncodedThreadCurrentUserInfo(currentUser),
  };
};

export {
  minimallyEncodedRoleInfoValidator,
  minimallyEncodeRoleInfo,
  decodeMinimallyEncodedRoleInfo,
  minimallyEncodedThreadCurrentUserInfoValidator,
  minimallyEncodeThreadCurrentUserInfo,
  decodeMinimallyEncodedThreadCurrentUserInfo,
  minimallyEncodedMemberInfoValidator,
  minimallyEncodeMemberInfo,
  decodeMinimallyEncodedMemberInfo,
  minimallyEncodedRawThreadInfoValidator,
  minimallyEncodeRawThreadInfo,
  decodeMinimallyEncodedRawThreadInfo,
  minimallyEncodedRelativeMemberInfoValidator,
  minimallyEncodeRelativeMemberInfo,
  decodeMinimallyEncodedRelativeMemberInfo,
  minimallyEncodedThreadInfoValidator,
  minimallyEncodeThreadInfo,
  decodeMinimallyEncodedThreadInfo,
};
