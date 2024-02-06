// @flow

import t, { type TInterface, type TUnion } from 'tcomb';

import {
  tHexEncodedPermissionsBitmask,
  tHexEncodedRolePermission,
} from './minimally-encoded-thread-permissions.js';
import { specialRoleValidator } from './special-roles.js';
import { clientAvatarValidator } from '../types/avatar-types.js';
import type {
  MemberInfo,
  ThreadCurrentUserInfo,
  RawThreadInfo,
  RelativeMemberInfo,
  RoleInfo,
  ThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { threadTypeValidator } from '../types/thread-types-enum.js';
import {
  legacyMemberInfoValidator,
  legacyRawThreadInfoValidator,
  clientLegacyRoleInfoValidator,
  legacyThreadCurrentUserInfoValidator,
} from '../types/thread-types.js';
import type { LegacyRawThreadInfo } from '../types/thread-types.js';
import { threadEntityValidator } from '../utils/entity-text.js';
import { tBool, tID, tShape } from '../utils/validation-utils.js';

const roleInfoValidator: TInterface<RoleInfo> = tShape<RoleInfo>({
  ...clientLegacyRoleInfoValidator.meta.props,
  minimallyEncoded: tBool(true),
  permissions: t.list(tHexEncodedRolePermission),
  specialRole: t.maybe(specialRoleValidator),
});

const threadCurrentUserInfoValidator: TInterface<ThreadCurrentUserInfo> =
  tShape<ThreadCurrentUserInfo>({
    ...legacyThreadCurrentUserInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    permissions: tHexEncodedPermissionsBitmask,
  });

const MemberInfoValidator: TInterface<MemberInfo> = tShape<MemberInfo>({
  ...legacyMemberInfoValidator.meta.props,
  minimallyEncoded: tBool(true),
  permissions: tHexEncodedPermissionsBitmask,
});

const relativeMemberInfoValidator: TInterface<RelativeMemberInfo> =
  tShape<RelativeMemberInfo>({
    ...MemberInfoValidator.meta.props,
    username: t.maybe(t.String),
    isViewer: t.Boolean,
  });

const threadInfoValidator: TInterface<ThreadInfo> = tShape<ThreadInfo>({
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
  members: t.list(relativeMemberInfoValidator),
  roles: t.dict(tID, roleInfoValidator),
  currentUser: threadCurrentUserInfoValidator,
  sourceMessageID: t.maybe(tID),
  repliesCount: t.Number,
  pinnedCount: t.maybe(t.Number),
});

const rawThreadInfoValidator: TInterface<RawThreadInfo> = tShape<RawThreadInfo>(
  {
    ...legacyRawThreadInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    members: t.list(MemberInfoValidator),
    roles: t.dict(tID, roleInfoValidator),
    currentUser: threadCurrentUserInfoValidator,
  },
);

export const mixedRawThreadInfoValidator: TUnion<
  LegacyRawThreadInfo | RawThreadInfo,
> = t.union([legacyRawThreadInfoValidator, rawThreadInfoValidator]);

export {
  roleInfoValidator,
  threadCurrentUserInfoValidator,
  MemberInfoValidator,
  relativeMemberInfoValidator,
  threadInfoValidator,
  rawThreadInfoValidator,
};
