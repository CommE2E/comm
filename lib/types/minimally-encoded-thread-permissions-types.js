// @flow

import _mapValues from 'lodash/fp/mapValues.js';

import type {
  LegacyMemberInfo,
  LegacyRawThreadInfo,
  LegacyRelativeMemberInfo,
  LegacyRoleInfo,
  ThreadCurrentUserInfo,
  ThreadInfo,
} from './thread-types.js';
import {
  decodeThreadRolePermissionsBitmaskArray,
  permissionsToBitmaskHex,
  threadPermissionsFromBitmaskHex,
  threadRolePermissionsBlobToBitmaskArray,
} from '../permissions/minimally-encoded-thread-permissions.js';

export type MinimallyEncodedRoleInfo = $ReadOnly<{
  ...LegacyRoleInfo,
  +minimallyEncoded: true,
  +permissions: $ReadOnlyArray<string>,
}>;

const minimallyEncodeRoleInfo = (
  roleInfo: LegacyRoleInfo,
): MinimallyEncodedRoleInfo => ({
  ...roleInfo,
  minimallyEncoded: true,
  permissions: threadRolePermissionsBlobToBitmaskArray(roleInfo.permissions),
});

const decodeMinimallyEncodedRoleInfo = (
  minimallyEncodedRoleInfo: MinimallyEncodedRoleInfo,
): LegacyRoleInfo => {
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
  ...LegacyMemberInfo,
  +minimallyEncoded: true,
  +permissions: string,
}>;

const minimallyEncodeMemberInfo = (
  memberInfo: LegacyMemberInfo,
): MinimallyEncodedMemberInfo => ({
  ...memberInfo,
  minimallyEncoded: true,
  permissions: permissionsToBitmaskHex(memberInfo.permissions),
});

const decodeMinimallyEncodedMemberInfo = (
  minimallyEncodedMemberInfo: MinimallyEncodedMemberInfo,
): LegacyMemberInfo => {
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

const minimallyEncodeRelativeMemberInfo = (
  relativeMemberInfo: LegacyRelativeMemberInfo,
): MinimallyEncodedRelativeMemberInfo => ({
  ...relativeMemberInfo,
  minimallyEncoded: true,
  permissions: permissionsToBitmaskHex(relativeMemberInfo.permissions),
});

const decodeMinimallyEncodedRelativeMemberInfo = (
  minimallyEncodedRelativeMemberInfo: MinimallyEncodedRelativeMemberInfo,
): LegacyRelativeMemberInfo => {
  const { minimallyEncoded, ...rest } = minimallyEncodedRelativeMemberInfo;
  return {
    ...rest,
    permissions: threadPermissionsFromBitmaskHex(
      minimallyEncodedRelativeMemberInfo.permissions,
    ),
  };
};

export type MinimallyEncodedRawThreadInfo = $ReadOnly<{
  ...LegacyRawThreadInfo,
  +minimallyEncoded: true,
  +members: $ReadOnlyArray<MinimallyEncodedMemberInfo>,
  +roles: { +[id: string]: MinimallyEncodedRoleInfo },
  +currentUser: MinimallyEncodedThreadCurrentUserInfo,
}>;

const minimallyEncodeRawThreadInfo = (
  rawThreadInfo: LegacyRawThreadInfo,
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

export type MinimallyEncodedThreadInfo = $ReadOnly<{
  ...ThreadInfo,
  +minimallyEncoded: true,
  +members: $ReadOnlyArray<MinimallyEncodedRelativeMemberInfo>,
  +roles: { +[id: string]: MinimallyEncodedRoleInfo },
  +currentUser: MinimallyEncodedThreadCurrentUserInfo,
}>;

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

export type MinimallyEncodedResolvedThreadInfo = $ReadOnly<{
  ...MinimallyEncodedThreadInfo,
  +uiName: string,
}>;

export {
  minimallyEncodeRoleInfo,
  decodeMinimallyEncodedRoleInfo,
  minimallyEncodeThreadCurrentUserInfo,
  decodeMinimallyEncodedThreadCurrentUserInfo,
  minimallyEncodeMemberInfo,
  decodeMinimallyEncodedMemberInfo,
  minimallyEncodeRawThreadInfo,
  decodeMinimallyEncodedRawThreadInfo,
  minimallyEncodeRelativeMemberInfo,
  decodeMinimallyEncodedRelativeMemberInfo,
  minimallyEncodeThreadInfo,
  decodeMinimallyEncodedThreadInfo,
};
