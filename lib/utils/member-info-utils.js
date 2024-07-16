// @flow

import invariant from 'invariant';

import type {
  MemberInfoSansPermissions,
  MemberInfoWithPermissions,
  RawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';

function stripPermissionsFromMemberInfo(
  memberInfo: MemberInfoWithPermissions,
): MemberInfoSansPermissions {
  const { permissions, ...rest } = memberInfo;
  return rest;
}

function stripMemberPermissionsFromRawThreadInfo(
  rawThreadInfo: RawThreadInfo,
): RawThreadInfo {
  invariant(
    !rawThreadInfo.thick,
    'Expect ThinRawThreadInfo in stripMemberPermissionsFromRawThreadInfo',
  );
  return {
    ...rawThreadInfo,
    members: rawThreadInfo.members.map(stripPermissionsFromMemberInfo),
  };
}

export {
  stripPermissionsFromMemberInfo,
  stripMemberPermissionsFromRawThreadInfo,
};
