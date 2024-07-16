// @flow

import type {
  MemberInfoSansPermissions,
  MemberInfoWithPermissions,
  ThinRawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';

function stripPermissionsFromMemberInfo(
  memberInfo: MemberInfoWithPermissions,
): MemberInfoSansPermissions {
  const { permissions, ...rest } = memberInfo;
  return rest;
}

export type ThinRawThreadInfoWithPermissions = $ReadOnly<{
  ...ThinRawThreadInfo,
  +members: $ReadOnlyArray<MemberInfoWithPermissions>,
}>;

function stripMemberPermissionsFromRawThreadInfo(
  rawThreadInfo: ThinRawThreadInfoWithPermissions,
): ThinRawThreadInfo {
  return {
    ...rawThreadInfo,
    members: rawThreadInfo.members.map(stripPermissionsFromMemberInfo),
  };
}

export {
  stripPermissionsFromMemberInfo,
  stripMemberPermissionsFromRawThreadInfo,
};
