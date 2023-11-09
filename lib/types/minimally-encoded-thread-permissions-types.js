// @flow

import _mapValues from 'lodash/fp/mapValues.js';
import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { clientAvatarValidator } from './avatar-types.js';
import { threadSubscriptionValidator } from './subscription-types.js';
import { threadTypeValidator } from './thread-types-enum.js';
import type {
  MemberInfo,
  RawThreadInfo,
  RoleInfo,
  ThreadCurrentUserInfo,
} from './thread-types.js';
import {
  decodeThreadRolePermissionsBitmaskArray,
  permissionsToBitmaskHex,
  threadPermissionsFromBitmaskHex,
  threadRolePermissionsBlobToBitmaskArray,
} from '../permissions/minimally-encoded-thread-permissions.js';
import type { TRegex } from '../utils/validation-utils.js';
import { tBool, tID, tRegex, tShape } from '../utils/validation-utils.js';

// ------------------ MinimallyEncodedRoleInfo START --------------------------

export type MinimallyEncodedRoleInfo = $ReadOnly<{
  ...RoleInfo,
  +minimallyEncoded: true,
  +permissions: $ReadOnlyArray<string>,
}>;

const tHexEncodedRolePermission: TRegex = tRegex(/^[0-9a-fA-F]{3,}$/);
const minimallyEncodedRoleInfoValidator: TInterface<MinimallyEncodedRoleInfo> =
  tShape<MinimallyEncodedRoleInfo>({
    minimallyEncoded: tBool(true),
    id: tID,
    name: t.String,
    isDefault: t.Boolean,
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

// ------------------ MinimallyEncodedRoleInfo END ----------------------------

// ------------------ MinimallyEncodedThreadCurrentUserInfo START -------------

export type MinimallyEncodedThreadCurrentUserInfo = $ReadOnly<{
  ...ThreadCurrentUserInfo,
  +minimallyEncoded: true,
  +permissions: string,
}>;

const tHexEncodedPermissionsBitmask: TRegex = tRegex(/^[0-9a-fA-F]+$/);
const minimallyEncodedThreadCurrentUserInfoValidator: TInterface<MinimallyEncodedThreadCurrentUserInfo> =
  tShape<MinimallyEncodedThreadCurrentUserInfo>({
    minimallyEncoded: tBool(true),
    role: t.maybe(tID),
    subscription: threadSubscriptionValidator,
    permissions: tHexEncodedPermissionsBitmask,
    unread: t.maybe(t.Boolean),
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

// ------------------ MinimallyEncodedThreadCurrentUserInfo END ---------------

// ------------------ MinimallyEncodedMemberInfo START ------------------------

export type MinimallyEncodedMemberInfo = $ReadOnly<{
  ...MemberInfo,
  +minimallyEncoded: true,
  +permissions: string,
}>;

const minimallyEncodedMemberInfoValidator: TInterface<MinimallyEncodedMemberInfo> =
  tShape<MinimallyEncodedMemberInfo>({
    minimallyEncoded: tBool(true),
    id: t.String,
    role: t.maybe(tID),
    permissions: tHexEncodedPermissionsBitmask,
    isSender: t.Boolean,
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

// ------------------ MinimallyEncodedMemberInfo END --------------------------

// ------------------ MinimallyEncodedRawThreadInfo START ---------------------

export type MinimallyEncodedRawThreadInfo = $ReadOnly<{
  ...RawThreadInfo,
  +minimallyEncoded: true,
  +members: $ReadOnlyArray<MinimallyEncodedMemberInfo>,
  +roles: { +[id: string]: MinimallyEncodedRoleInfo },
  +currentUser: MinimallyEncodedThreadCurrentUserInfo,
}>;

const minimallyEncodedRawThreadInfoValidator: TInterface<MinimallyEncodedRawThreadInfo> =
  tShape<MinimallyEncodedRawThreadInfo>({
    minimallyEncoded: tBool(true),
    id: tID,
    type: threadTypeValidator,
    name: t.maybe(t.String),
    avatar: t.maybe(clientAvatarValidator),
    description: t.maybe(t.String),
    color: t.String,
    creationTime: t.Number,
    parentThreadID: t.maybe(tID),
    containingThreadID: t.maybe(tID),
    community: t.maybe(tID),
    members: t.list(minimallyEncodedMemberInfoValidator),
    roles: t.dict(tID, minimallyEncodedRoleInfoValidator),
    currentUser: minimallyEncodedThreadCurrentUserInfoValidator,
    sourceMessageID: t.maybe(tID),
    repliesCount: t.Number,
    pinnedCount: t.maybe(t.Number),
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

// ------------------ MinimallyEncodedRawThreadInfo END -----------------------

export {
  tHexEncodedRolePermission,
  minimallyEncodedRoleInfoValidator,
  minimallyEncodeRoleInfo,
  decodeMinimallyEncodedRoleInfo,
  tHexEncodedPermissionsBitmask,
  minimallyEncodedThreadCurrentUserInfoValidator,
  minimallyEncodeThreadCurrentUserInfo,
  decodeMinimallyEncodedThreadCurrentUserInfo,
  minimallyEncodedMemberInfoValidator,
  minimallyEncodeMemberInfo,
  decodeMinimallyEncodedMemberInfo,
  minimallyEncodedRawThreadInfoValidator,
  minimallyEncodeRawThreadInfo,
  decodeMinimallyEncodedRawThreadInfo,
};
