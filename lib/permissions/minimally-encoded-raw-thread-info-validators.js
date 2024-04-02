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
  RoleInfoWithoutSpecialRole,
  RawThreadInfoWithoutSpecialRole,
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

const roleInfoValidatorBase = {
  id: tID,
  name: t.String,
  minimallyEncoded: tBool(true),
  permissions: t.list(tHexEncodedRolePermission),
};

const roleInfoValidator: TInterface<RoleInfo> = tShape<RoleInfo>({
  ...roleInfoValidatorBase,
  specialRole: t.maybe(specialRoleValidator),
});

type RoleInfoPossiblyWithIsDefaultField = $ReadOnly<{
  ...RoleInfo,
  +isDefault?: boolean,
}>;
// This validator is to be used in `convertClientDBThreadInfoToRawThreadInfo`
// which validates the persisted JSON blob BEFORE any migrations are run.
// `roleInfoValidator` will fail for persisted `RoleInfo`s that include
// the `isDefault` field. Figured it made sense to create a separate validator
// instead of adding complexity to `roleInfoValidator` which should maintain
// 1:1 correspondance with the `RoleInfo` type.
const persistedRoleInfoValidator: TInterface<RoleInfoPossiblyWithIsDefaultField> =
  tShape<RoleInfoPossiblyWithIsDefaultField>({
    id: tID,
    name: t.String,
    minimallyEncoded: tBool(true),
    permissions: t.list(tHexEncodedRolePermission),
    specialRole: t.maybe(specialRoleValidator),
    isDefault: t.maybe(t.Boolean),
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

const roleInfoWithoutSpecialRolesValidator: TInterface<RoleInfoWithoutSpecialRole> =
  tShape<RoleInfoWithoutSpecialRole>({
    ...roleInfoValidatorBase,
    isDefault: t.maybe(t.Boolean),
  });

const rawThreadInfoWithoutSpecialRoles: TInterface<RawThreadInfoWithoutSpecialRole> =
  tShape<RawThreadInfoWithoutSpecialRole>({
    ...rawThreadInfoValidator.meta.props,
    roles: t.dict(tID, roleInfoWithoutSpecialRolesValidator),
  });

const mixedRawThreadInfoValidator: TUnion<
  LegacyRawThreadInfo | RawThreadInfo | RawThreadInfoWithoutSpecialRole,
> = t.union([
  legacyRawThreadInfoValidator,
  rawThreadInfoValidator,
  rawThreadInfoWithoutSpecialRoles,
]);

export {
  memberInfoValidator,
  roleInfoValidator,
  persistedRoleInfoValidator,
  threadCurrentUserInfoValidator,
  rawThreadInfoValidator,
  mixedRawThreadInfoValidator,
};
