// @flow

import type {
  MemberInfoSansPermissions,
  MemberInfoWithPermissions,
} from '../types/minimally-encoded-thread-permissions-types.js';

function stripPermissionsFromMemberInfo(
  memberInfo: MemberInfoWithPermissions,
): MemberInfoSansPermissions {
  const { permissions, ...rest } = memberInfo;
  return rest;
}

export { stripPermissionsFromMemberInfo };
