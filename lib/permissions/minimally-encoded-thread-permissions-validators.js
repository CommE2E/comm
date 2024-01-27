// @flow

import t, { type TInterface, type TUnion } from 'tcomb';

import {
  tHexEncodedPermissionsBitmask,
  tHexEncodedRolePermission,
} from './minimally-encoded-thread-permissions.js';
import { clientAvatarValidator } from '../types/avatar-types.js';
import type {
  MinimallyEncodedMemberInfo,
  RawThreadInfo,
  MinimallyEncodedRelativeMemberInfo,
  ResolvedThreadInfo,
  MinimallyEncodedRoleInfo,
  MinimallyEncodedThreadCurrentUserInfo,
  ThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { threadTypeValidator } from '../types/thread-types-enum.js';
import {
  legacyMemberInfoValidator,
  legacyRawThreadInfoValidator,
  legacyRoleInfoValidator,
  threadCurrentUserInfoValidator,
} from '../types/thread-types.js';
import type { LegacyRawThreadInfo } from '../types/thread-types.js';
import { threadEntityValidator } from '../utils/entity-text.js';
import { tBool, tID, tShape } from '../utils/validation-utils.js';

const minimallyEncodedRoleInfoValidator: TInterface<MinimallyEncodedRoleInfo> =
  tShape<MinimallyEncodedRoleInfo>({
    ...legacyRoleInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    permissions: t.list(tHexEncodedRolePermission),
  });

const minimallyEncodedThreadCurrentUserInfoValidator: TInterface<MinimallyEncodedThreadCurrentUserInfo> =
  tShape<MinimallyEncodedThreadCurrentUserInfo>({
    ...threadCurrentUserInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    permissions: tHexEncodedPermissionsBitmask,
  });

const minimallyEncodedMemberInfoValidator: TInterface<MinimallyEncodedMemberInfo> =
  tShape<MinimallyEncodedMemberInfo>({
    ...legacyMemberInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    permissions: tHexEncodedPermissionsBitmask,
  });

const minimallyEncodedRelativeMemberInfoValidator: TInterface<MinimallyEncodedRelativeMemberInfo> =
  tShape<MinimallyEncodedRelativeMemberInfo>({
    ...minimallyEncodedMemberInfoValidator.meta.props,
    username: t.maybe(t.String),
    isViewer: t.Boolean,
  });

const minimallyEncodedThreadInfoValidator: TInterface<ThreadInfo> =
  tShape<ThreadInfo>({
    minimallyEncoded: tBool(true),
    id: tID,
    type: threadTypeValidator,
    name: t.maybe(t.String),
    uiName: t.union([t.String, threadEntityValidator]),
    avatar: t.maybe(clientAvatarValidator),
    description: t.maybe(t.String),
    color: t.String,
    creationTime: t.Number,
    parentThreadID: t.maybe(tID),
    containingThreadID: t.maybe(tID),
    community: t.maybe(tID),
    members: t.list(minimallyEncodedRelativeMemberInfoValidator),
    roles: t.dict(tID, minimallyEncodedRoleInfoValidator),
    currentUser: minimallyEncodedThreadCurrentUserInfoValidator,
    sourceMessageID: t.maybe(tID),
    repliesCount: t.Number,
    pinnedCount: t.maybe(t.Number),
  });

const resolvedThreadInfoValidator: TInterface<ResolvedThreadInfo> =
  tShape<ResolvedThreadInfo>({
    ...minimallyEncodedThreadInfoValidator.meta.props,
    uiName: t.String,
  });

const minimallyEncodedRawThreadInfoValidator: TInterface<RawThreadInfo> =
  tShape<RawThreadInfo>({
    ...legacyRawThreadInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    members: t.list(minimallyEncodedMemberInfoValidator),
    roles: t.dict(tID, minimallyEncodedRoleInfoValidator),
    currentUser: minimallyEncodedThreadCurrentUserInfoValidator,
  });

export const rawThreadInfoValidator: TUnion<
  LegacyRawThreadInfo | RawThreadInfo,
> = t.union([
  legacyRawThreadInfoValidator,
  minimallyEncodedRawThreadInfoValidator,
]);

export {
  minimallyEncodedRoleInfoValidator,
  minimallyEncodedThreadCurrentUserInfoValidator,
  minimallyEncodedMemberInfoValidator,
  minimallyEncodedRelativeMemberInfoValidator,
  minimallyEncodedThreadInfoValidator,
  resolvedThreadInfoValidator,
  minimallyEncodedRawThreadInfoValidator,
};
