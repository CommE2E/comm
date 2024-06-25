// @flow

import { legacyUpdateRolesAndPermissions } from './legacy-update-roles-and-permissions.js';
import {
  decodeMinimallyEncodedRawThreadInfo,
  minimallyEncodeRawThreadInfo,
  type RawThreadInfo,
} from '../../types/minimally-encoded-thread-permissions-types.js';
import type {
  RawThreadInfos,
  LegacyRawThreadInfo,
} from '../../types/thread-types.js';
import type { RawThreadInfoWithMemberPermissions } from '../../types/minimally-encoded-thread-permissions-types.js';

function updateRolesAndPermissions(
  threadStoreInfos: RawThreadInfos,
): RawThreadInfos {
  const decodedThreadStoreInfos: { [id: string]: LegacyRawThreadInfo } = {};

  for (const threadID in threadStoreInfos) {
    const rawThreadInfo = threadStoreInfos[threadID];

    const decodedThreadInfo =
      decodeMinimallyEncodedRawThreadInfo(rawThreadInfo);

    decodedThreadStoreInfos[threadID] = decodedThreadInfo;
  }

  const updatedDecodedThreadStoreInfos = legacyUpdateRolesAndPermissions(
    decodedThreadStoreInfos,
  );

  const updatedThreadStoreInfos: { [id: string]: RawThreadInfo } = {};

  for (const threadID in updatedDecodedThreadStoreInfos) {
    const updatedThreadInfo: LegacyRawThreadInfo =
      updatedDecodedThreadStoreInfos[threadID];

    const encodedUpdatedThreadInfo =
      minimallyEncodeRawThreadInfo(updatedThreadInfo);

    updatedThreadStoreInfos[threadID] = encodedUpdatedThreadInfo;
  }

  return updatedThreadStoreInfos;
}

export { updateRolesAndPermissions };
