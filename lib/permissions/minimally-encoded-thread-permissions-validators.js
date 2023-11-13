// @flow
import t, { type TInterface } from 'tcomb';

import {
  tHexEncodedPermissionsBitmask,
  tHexEncodedRolePermission,
} from './minimally-encoded-thread-permissions.js';
import type {
  MinimallyEncodedMemberInfo,
  MinimallyEncodedRawThreadInfo,
  MinimallyEncodedRelativeMemberInfo,
  MinimallyEncodedRoleInfo,
  MinimallyEncodedThreadCurrentUserInfo,
  MinimallyEncodedThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import {
  memberInfoValidator,
  rawThreadInfoValidator,
  roleInfoValidator,
  threadCurrentUserInfoValidator,
  threadInfoValidator,
} from '../types/thread-types.js';
import { tBool, tID, tShape } from '../utils/validation-utils.js';

const minimallyEncodedRoleInfoValidator: TInterface<MinimallyEncodedRoleInfo> =
  tShape<MinimallyEncodedRoleInfo>({
    ...roleInfoValidator.meta.props,
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
    ...memberInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    permissions: tHexEncodedPermissionsBitmask,
  });

const minimallyEncodedRelativeMemberInfoValidator: TInterface<MinimallyEncodedRelativeMemberInfo> =
  tShape<MinimallyEncodedRelativeMemberInfo>({
    ...minimallyEncodedMemberInfoValidator.meta.props,
    username: t.maybe(t.String),
    isViewer: t.Boolean,
  });

const minimallyEncodedThreadInfoValidator: TInterface<MinimallyEncodedThreadInfo> =
  tShape<MinimallyEncodedThreadInfo>({
    ...threadInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    members: t.list(minimallyEncodedRelativeMemberInfoValidator),
    roles: t.dict(tID, minimallyEncodedRoleInfoValidator),
    currentUser: minimallyEncodedThreadCurrentUserInfoValidator,
  });

const minimallyEncodedRawThreadInfoValidator: TInterface<MinimallyEncodedRawThreadInfo> =
  tShape<MinimallyEncodedRawThreadInfo>({
    ...rawThreadInfoValidator.meta.props,
    minimallyEncoded: tBool(true),
    members: t.list(minimallyEncodedMemberInfoValidator),
    roles: t.dict(tID, minimallyEncodedRoleInfoValidator),
    currentUser: minimallyEncodedThreadCurrentUserInfoValidator,
  });

export {
  minimallyEncodedRoleInfoValidator,
  minimallyEncodedThreadCurrentUserInfoValidator,
  minimallyEncodedMemberInfoValidator,
  minimallyEncodedRelativeMemberInfoValidator,
  minimallyEncodedThreadInfoValidator,
  minimallyEncodedRawThreadInfoValidator,
};
