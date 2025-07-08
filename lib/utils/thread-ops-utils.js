// @flow

import invariant from 'invariant';

import {
  memberInfoWithPermissionsValidator,
  persistedRoleInfoValidator,
  threadCurrentUserInfoValidator,
  minimallyEncodedThickMemberInfoValidator,
  memberInfoSansPermissionsValidator,
} from '../permissions/minimally-encoded-raw-thread-info-validators.js';
import { threadSpecs } from '../shared/threads/thread-specs.js';
import type {
  RawThreadInfo,
  RoleInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import {
  deprecatedDecodeMinimallyEncodedRawThreadInfo,
  minimallyEncodeMemberInfo,
  minimallyEncodeRoleInfo,
  minimallyEncodeThreadCurrentUserInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { assertThreadType } from '../types/thread-types-enum.js';
import {
  type ClientDBThreadInfo,
  legacyMemberInfoValidator,
  type LegacyRawThreadInfo,
  clientLegacyRoleInfoValidator,
  legacyThreadCurrentUserInfoValidator,
} from '../types/thread-types.js';

function convertRawThreadInfoToClientDBThreadInfo(
  rawThreadInfo: LegacyRawThreadInfo | RawThreadInfo,
): ClientDBThreadInfo {
  const { minimallyEncoded, thick, ...rest } = rawThreadInfo;
  return {
    ...rest,
    creationTime: rawThreadInfo.creationTime.toString(),
    members: JSON.stringify(rawThreadInfo.members),
    roles: JSON.stringify(rawThreadInfo.roles),
    currentUser: JSON.stringify(rawThreadInfo.currentUser),
    avatar: rawThreadInfo.avatar ? JSON.stringify(rawThreadInfo.avatar) : null,
    community: rawThreadInfo.community,
    timestamps: rawThreadInfo.timestamps
      ? JSON.stringify(rawThreadInfo.timestamps)
      : null,
  };
}

function convertClientDBThreadInfoToRawThreadInfo(
  clientDBThreadInfo: ClientDBThreadInfo,
): RawThreadInfo {
  // 1. Validate and potentially minimally encode `rawMembers`.
  const rawMembers = JSON.parse(clientDBThreadInfo.members);
  const minimallyEncodedMembers = rawMembers.map(rawMember => {
    invariant(
      memberInfoSansPermissionsValidator.is(rawMember) ||
        minimallyEncodedThickMemberInfoValidator.is(rawMember) ||
        memberInfoWithPermissionsValidator.is(rawMember) ||
        legacyMemberInfoValidator.is(rawMember),
      'rawMember must be valid [MinimallyEncoded/Legacy]MemberInfo',
    );
    return rawMember.minimallyEncoded
      ? rawMember
      : minimallyEncodeMemberInfo(rawMember);
  });

  // 2. Validate and potentially minimally encode `rawRoles`.
  const rawRoles = JSON.parse(clientDBThreadInfo.roles);
  const minimallyEncodedRoles: { +[id: string]: RoleInfo } = Object.keys(
    rawRoles,
  ).reduce((acc: { [string]: RoleInfo }, roleID: string) => {
    const roleInfo = rawRoles[roleID];
    invariant(
      persistedRoleInfoValidator.is(roleInfo) ||
        clientLegacyRoleInfoValidator.is(roleInfo),
      'rawRole must be valid [MinimallyEncoded/Legacy]RoleInfo',
    );
    acc[roleID] = roleInfo.minimallyEncoded
      ? roleInfo
      : minimallyEncodeRoleInfo(roleInfo);
    return acc;
  }, {});

  // 3. Validate and potentially minimally encode `rawCurrentUser`.
  const rawCurrentUser = JSON.parse(clientDBThreadInfo.currentUser);
  invariant(
    threadCurrentUserInfoValidator.is(rawCurrentUser) ||
      legacyThreadCurrentUserInfoValidator.is(rawCurrentUser),
    'rawCurrentUser must be valid [MinimallyEncoded]ThreadCurrentUserInfo',
  );
  const minimallyEncodedCurrentUser = rawCurrentUser.minimallyEncoded
    ? rawCurrentUser
    : minimallyEncodeThreadCurrentUserInfo(rawCurrentUser);

  const threadType = assertThreadType(clientDBThreadInfo.type);

  return threadSpecs[threadType]
    .protocol()
    .convertClientDBThreadInfo(
      clientDBThreadInfo,
      minimallyEncodedMembers,
      minimallyEncodedRoles,
      minimallyEncodedCurrentUser,
    );
}

// WARNING: Do not consume or delete this function!
// This function is being left in the codebase **SOLELY** to ensure that
// previous `native` redux migrations continue to behave as expected.
function deprecatedConvertClientDBThreadInfoToRawThreadInfo(
  clientDBThreadInfo: ClientDBThreadInfo,
): LegacyRawThreadInfo {
  const minimallyEncoded =
    convertClientDBThreadInfoToRawThreadInfo(clientDBThreadInfo);
  return deprecatedDecodeMinimallyEncodedRawThreadInfo(minimallyEncoded);
}

export {
  convertRawThreadInfoToClientDBThreadInfo,
  convertClientDBThreadInfoToRawThreadInfo,
  deprecatedConvertClientDBThreadInfoToRawThreadInfo,
};
