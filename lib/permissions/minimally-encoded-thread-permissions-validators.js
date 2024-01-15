// @flow

import t, { type TInterface, type TUnion } from 'tcomb';

import {
  tHexEncodedPermissionsBitmask,
  tHexEncodedRolePermission,
} from './minimally-encoded-thread-permissions.js';
import type {
  MinimallyEncodedMemberInfo,
  RawThreadInfo,
  MinimallyEncodedRelativeMemberInfo,
  MinimallyEncodedResolvedThreadInfo,
  MinimallyEncodedRoleInfo,
  MinimallyEncodedThreadCurrentUserInfo,
  ThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import {
  legacyMemberInfoValidator,
  legacyRawThreadInfoValidator,
  legacyRoleInfoValidator,
  threadCurrentUserInfoValidator,
  legacyThreadInfoValidator,
} from '../types/thread-types.js';
import type { LegacyRawThreadInfo } from '../types/thread-types.js';
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
    ...legacyThreadInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    members: t.list(minimallyEncodedRelativeMemberInfoValidator),
    roles: t.dict(tID, minimallyEncodedRoleInfoValidator),
    currentUser: minimallyEncodedThreadCurrentUserInfoValidator,
  });

const minimallyEncodedResolvedThreadInfoValidator: TInterface<MinimallyEncodedResolvedThreadInfo> =
  tShape<MinimallyEncodedResolvedThreadInfo>({
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
  minimallyEncodedResolvedThreadInfoValidator,
  minimallyEncodedRawThreadInfoValidator,
};
