// @flow

import invariant from 'invariant';

import {
  minimallyEncodedMemberInfoValidator,
  minimallyEncodedRoleInfoValidator,
} from '../permissions/minimally-encoded-thread-permissions-validators.js';
import type {
  MinimallyEncodedMemberInfo,
  MinimallyEncodedRawThreadInfo,
  MinimallyEncodedRoleInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import {
  decodeMinimallyEncodedRawThreadInfo,
  minimallyEncodeMemberInfo,
  minimallyEncodeRoleInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { assertThreadType } from '../types/thread-types-enum.js';
import {
  type ClientDBThreadInfo,
  legacyMemberInfoValidator,
  type LegacyRawThreadInfo,
  legacyRoleInfoValidator,
  type RawThreadInfo,
} from '../types/thread-types.js';

function convertRawThreadInfoToClientDBThreadInfo(
  rawThreadInfo: RawThreadInfo,
): ClientDBThreadInfo {
  const { minimallyEncoded, ...rest } = rawThreadInfo;
  return {
    ...rest,
    creationTime: rawThreadInfo.creationTime.toString(),
    members: JSON.stringify(rawThreadInfo.members),
    roles: JSON.stringify(rawThreadInfo.roles),
    currentUser: JSON.stringify(rawThreadInfo.currentUser),
    avatar: rawThreadInfo.avatar ? JSON.stringify(rawThreadInfo.avatar) : null,
  };
}

function convertClientDBThreadInfoToRawThreadInfo(
  clientDBThreadInfo: ClientDBThreadInfo,
): MinimallyEncodedRawThreadInfo {
  // 1. Validate and potentially minimally encode `rawMembers`.
  const rawMembers = JSON.parse(clientDBThreadInfo.members);
  const minimallyEncodedMembers: $ReadOnlyArray<MinimallyEncodedMemberInfo> =
    rawMembers.map(rawMember => {
      invariant(
        minimallyEncodedMemberInfoValidator.is(rawMember) ||
          legacyMemberInfoValidator.is(rawMember),
        'rawMember must be correctly formed [MinimallyEncoded/Legacy]MemberInfo',
      );
      return rawMember.minimallyEncoded
        ? rawMember
        : minimallyEncodeMemberInfo(rawMember);
    });

  // 2. Validate and potentially minimally encode `rawRoles`.
  const rawRoles = JSON.parse(clientDBThreadInfo.roles);
  const minimallyEncodedRoles: { +[id: string]: MinimallyEncodedRoleInfo } =
    Object.keys(rawRoles).reduce(
      (acc: { [string]: MinimallyEncodedRoleInfo }, roleID: string) => {
        const roleInfo = rawRoles[roleID];
        invariant(
          minimallyEncodedRoleInfoValidator.is(roleInfo) ||
            legacyRoleInfoValidator.is(roleInfo),
          'rawRole must be correctly formed [MinimallyEncoded/Legacy]RoleInfo',
        );
        acc[roleID] = roleInfo.minimallyEncoded
          ? roleInfo
          : minimallyEncodeRoleInfo(roleInfo);
        return acc;
      },
      {},
    );

  let rawThreadInfo: MinimallyEncodedRawThreadInfo = {
    minimallyEncoded: true,
    id: clientDBThreadInfo.id,
    type: assertThreadType(clientDBThreadInfo.type),
    name: clientDBThreadInfo.name,
    description: clientDBThreadInfo.description,
    color: clientDBThreadInfo.color,
    creationTime: Number(clientDBThreadInfo.creationTime),
    parentThreadID: clientDBThreadInfo.parentThreadID,
    containingThreadID: clientDBThreadInfo.containingThreadID,
    community: clientDBThreadInfo.community,
    members: minimallyEncodedMembers,
    roles: minimallyEncodedRoles,
    currentUser: JSON.parse(clientDBThreadInfo.currentUser),
    repliesCount: clientDBThreadInfo.repliesCount,
    pinnedCount: clientDBThreadInfo.pinnedCount,
  };

  if (clientDBThreadInfo.sourceMessageID) {
    rawThreadInfo = {
      ...rawThreadInfo,
      sourceMessageID: clientDBThreadInfo.sourceMessageID,
    };
  }

  if (clientDBThreadInfo.avatar) {
    rawThreadInfo = {
      ...rawThreadInfo,
      avatar: JSON.parse(clientDBThreadInfo.avatar),
    };
  }

  return rawThreadInfo;
}

// WARNING: Do not consume or delete this function!
// This function is being left in the codebase **SOLELY** to ensure that
// previous `native` redux migrations continue to behave as expected.
function deprecatedConvertClientDBThreadInfoToRawThreadInfo(
  clientDBThreadInfo: ClientDBThreadInfo,
): LegacyRawThreadInfo {
  const minimallyEncoded =
    convertClientDBThreadInfoToRawThreadInfo(clientDBThreadInfo);
  return decodeMinimallyEncodedRawThreadInfo(minimallyEncoded);
}

export {
  convertRawThreadInfoToClientDBThreadInfo,
  convertClientDBThreadInfoToRawThreadInfo,
  deprecatedConvertClientDBThreadInfoToRawThreadInfo,
};
