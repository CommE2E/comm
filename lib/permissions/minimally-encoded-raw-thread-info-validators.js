// @flow

import t, { type TInterface, type TUnion } from 'tcomb';

import {
  tHexEncodedPermissionsBitmask,
  tHexEncodedRolePermission,
} from './minimally-encoded-thread-permissions.js';
import { specialRoleValidator } from './special-roles.js';
import type {
  MemberInfoWithPermissions,
  ThreadCurrentUserInfo,
  ThinRawThreadInfo,
  ThickRawThreadInfo,
  RoleInfo,
  RoleInfoWithoutSpecialRole,
  ThinRawThreadInfoWithoutSpecialRole,
  MinimallyEncodedThickMemberInfo,
  MemberInfoSansPermissions,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { threadSubscriptionValidator } from '../types/subscription-types.js';
import {
  type LegacyThinRawThreadInfo,
  type LegacyRawThreadInfo,
  legacyMemberInfoValidator,
  legacyThinRawThreadInfoValidator,
  legacyThreadCurrentUserInfoValidator,
  legacyThickRawThreadInfoValidator,
  legacyThreadInfoValidator,
} from '../types/thread-types.js';
import { tBool, tID, tShape, tUserID } from '../utils/validation-utils.js';

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

const memberInfoWithPermissionsValidator: TInterface<MemberInfoWithPermissions> =
  tShape<MemberInfoWithPermissions>({
    ...legacyMemberInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    permissions: tHexEncodedPermissionsBitmask,
  });

const memberInfoSansPermissionsValidator: TInterface<MemberInfoSansPermissions> =
  tShape<MemberInfoSansPermissions>({
    id: tUserID,
    role: t.maybe(tID),
    isSender: t.Boolean,
    minimallyEncoded: tBool(true),
  });

const minimallyEncodedThickMemberInfoValidator: TInterface<MinimallyEncodedThickMemberInfo> =
  tShape<MinimallyEncodedThickMemberInfo>({
    minimallyEncoded: tBool(true),
    id: tUserID,
    role: t.maybe(tID),
    permissions: tHexEncodedPermissionsBitmask,
    isSender: t.Boolean,
    subscription: threadSubscriptionValidator,
  });

const thinRawThreadInfoValidator: TInterface<ThinRawThreadInfo> =
  tShape<ThinRawThreadInfo>({
    ...legacyThinRawThreadInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    members: t.union([
      t.list(memberInfoWithPermissionsValidator),
      t.list(memberInfoSansPermissionsValidator),
    ]),
    roles: t.dict(tID, roleInfoValidator),
    currentUser: threadCurrentUserInfoValidator,
  });

const thickRawThreadInfoValidator: TInterface<ThickRawThreadInfo> =
  tShape<ThickRawThreadInfo>({
    ...legacyThickRawThreadInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    members: t.list(minimallyEncodedThickMemberInfoValidator),
    roles: t.dict(tID, roleInfoValidator),
    currentUser: threadCurrentUserInfoValidator,
  });

const roleInfoWithoutSpecialRolesValidator: TInterface<RoleInfoWithoutSpecialRole> =
  tShape<RoleInfoWithoutSpecialRole>({
    ...roleInfoValidatorBase,
    isDefault: t.maybe(t.Boolean),
  });

const thinRawThreadInfoWithoutSpecialRolesValidator: TInterface<ThinRawThreadInfoWithoutSpecialRole> =
  tShape<ThinRawThreadInfoWithoutSpecialRole>({
    ...thinRawThreadInfoValidator.meta.props,
    roles: t.dict(tID, roleInfoWithoutSpecialRolesValidator),
  });

const mixedThinRawThreadInfoValidator: TUnion<
  | LegacyThinRawThreadInfo
  | ThinRawThreadInfo
  | ThinRawThreadInfoWithoutSpecialRole,
> = t.union([
  legacyThinRawThreadInfoValidator,
  thinRawThreadInfoValidator,
  thinRawThreadInfoWithoutSpecialRolesValidator,
]);

const rawThreadInfoValidator: TUnion<ThinRawThreadInfo | ThickRawThreadInfo> =
  t.union([thinRawThreadInfoValidator, thickRawThreadInfoValidator]);

const mixedThreadInfoValidator: TUnion<
  LegacyRawThreadInfo | ThinRawThreadInfo | ThickRawThreadInfo,
> = t.union([
  legacyThreadInfoValidator,
  thinRawThreadInfoValidator,
  thickRawThreadInfoValidator,
]);

export {
  memberInfoWithPermissionsValidator,
  memberInfoSansPermissionsValidator,
  minimallyEncodedThickMemberInfoValidator,
  roleInfoValidator,
  persistedRoleInfoValidator,
  threadCurrentUserInfoValidator,
  thinRawThreadInfoValidator,
  mixedThinRawThreadInfoValidator,
  mixedThreadInfoValidator,
  rawThreadInfoValidator,
};
