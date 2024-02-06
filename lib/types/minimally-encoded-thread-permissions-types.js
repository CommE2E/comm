// @flow

import invariant from 'invariant';
import _mapValues from 'lodash/fp/mapValues.js';

import type { ClientAvatar } from './avatar-types.js';
import type { ThreadType } from './thread-types-enum.js';
import type {
  LegacyMemberInfo,
  LegacyRawThreadInfo,
  LegacyRoleInfo,
  LegacyThreadCurrentUserInfo,
} from './thread-types.js';
import {
  decodeThreadRolePermissionsBitmaskArray,
  permissionsToBitmaskHex,
  threadPermissionsFromBitmaskHex,
  threadRolePermissionsBlobToBitmaskArray,
} from '../permissions/minimally-encoded-thread-permissions.js';
import type { SpecialRole } from '../permissions/special-roles.js';
import type { ThreadEntity } from '../utils/entity-text.js';

export type RoleInfo = $ReadOnly<{
  ...LegacyRoleInfo,
  +minimallyEncoded: true,
  +permissions: $ReadOnlyArray<string>,
  +specialRole?: ?SpecialRole,
}>;

const minimallyEncodeRoleInfo = (roleInfo: LegacyRoleInfo): RoleInfo => {
  invariant(
    !('minimallyEncoded' in roleInfo),
    'roleInfo is already minimally encoded.',
  );
  return {
    ...roleInfo,
    minimallyEncoded: true,
    permissions: threadRolePermissionsBlobToBitmaskArray(roleInfo.permissions),
  };
};

const decodeMinimallyEncodedRoleInfo = (
  minimallyEncodedRoleInfo: RoleInfo,
): LegacyRoleInfo => {
  const { minimallyEncoded, specialRole, ...rest } = minimallyEncodedRoleInfo;
  return {
    ...rest,
    permissions: decodeThreadRolePermissionsBitmaskArray(
      minimallyEncodedRoleInfo.permissions,
    ),
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

export type MemberInfo = $ReadOnly<{
  ...LegacyMemberInfo,
  +minimallyEncoded: true,
  +permissions: string,
}>;

const minimallyEncodeMemberInfo = (
  memberInfo: LegacyMemberInfo,
): MemberInfo => {
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
  minimallyEncodedMemberInfo: MemberInfo,
): LegacyMemberInfo => {
  const { minimallyEncoded, ...rest } = minimallyEncodedMemberInfo;
  return {
    ...rest,
    permissions: threadPermissionsFromBitmaskHex(
      minimallyEncodedMemberInfo.permissions,
    ),
  };
};

export type RelativeMemberInfo = $ReadOnly<{
  ...MemberInfo,
  +username: ?string,
  +isViewer: boolean,
}>;

export type RawThreadInfo = $ReadOnly<{
  ...LegacyRawThreadInfo,
  +minimallyEncoded: true,
  +members: $ReadOnlyArray<MemberInfo>,
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
  minimallyEncodeRawThreadInfo,
  decodeMinimallyEncodedRawThreadInfo,
};
