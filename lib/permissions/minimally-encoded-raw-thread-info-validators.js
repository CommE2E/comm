// @flow

import t, { type TInterface, type TUnion } from 'tcomb';

import {
  tHexEncodedPermissionsBitmask,
  tHexEncodedRolePermission,
} from './minimally-encoded-thread-permissions.js';
import { specialRoleValidator } from './special-roles.js';
import type {
  MemberInfo,
  ThreadCurrentUserInfo,
  RawThreadInfo,
  RoleInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import {
  type LegacyRawThreadInfo,
  legacyMemberInfoValidator,
  legacyRawThreadInfoValidator,
  legacyThreadCurrentUserInfoValidator,
} from '../types/thread-types.js';
import { tBool, tID, tShape } from '../utils/validation-utils.js';

const threadCurrentUserInfoValidator: TInterface<ThreadCurrentUserInfo> =
  tShape<ThreadCurrentUserInfo>({
    ...legacyThreadCurrentUserInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    permissions: tHexEncodedPermissionsBitmask,
  });

const roleInfoValidator: TInterface<RoleInfo> = tShape<RoleInfo>({
  id: tID,
  name: t.String,
  minimallyEncoded: tBool(true),
  permissions: t.list(tHexEncodedRolePermission),
  specialRole: t.maybe(specialRoleValidator),
});

const memberInfoValidator: TInterface<MemberInfo> = tShape<MemberInfo>({
  ...legacyMemberInfoValidator.meta.props,
  minimallyEncoded: tBool(true),
  permissions: tHexEncodedPermissionsBitmask,
});

const rawThreadInfoValidator: TInterface<RawThreadInfo> = tShape<RawThreadInfo>(
  {
    ...legacyRawThreadInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    members: t.list(memberInfoValidator),
    roles: t.dict(tID, roleInfoValidator),
    currentUser: threadCurrentUserInfoValidator,
  },
);

const mixedRawThreadInfoValidator: TUnion<LegacyRawThreadInfo | RawThreadInfo> =
  t.union([legacyRawThreadInfoValidator, rawThreadInfoValidator]);

export {
  memberInfoValidator,
  roleInfoValidator,
  threadCurrentUserInfoValidator,
  rawThreadInfoValidator,
  mixedRawThreadInfoValidator,
};
