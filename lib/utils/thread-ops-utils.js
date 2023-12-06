// @flow

import type { MinimallyEncodedRawThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { decodeMinimallyEncodedRawThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { assertThreadType } from '../types/thread-types-enum.js';
import {
  type ClientDBThreadInfo,
  type LegacyRawThreadInfo,
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
    members: JSON.parse(clientDBThreadInfo.members),
    roles: JSON.parse(clientDBThreadInfo.roles),
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
