// @flow

import type { RawThreadInfo } from '../types/thread-types.js';
import { rawThreadInfoValidator } from '../types/thread-types.js';
import { convertClientIDsToServerIDs } from '../utils/conversion-utils.js';
import { hash } from '../utils/objects.js';
import { ashoatKeyserverID } from '../utils/validation-utils.js';

function getThreadHashFromRawThreadInfo(
  threadInfo: RawThreadInfo,
  shouldConvert: boolean,
): number {
  let threadInfoToHash = threadInfo;
  if (shouldConvert) {
    threadInfoToHash = convertClientIDsToServerIDs(
      ashoatKeyserverID,
      rawThreadInfoValidator,
      threadInfoToHash,
    );
  }
  return hash(threadInfoToHash);
}

function getThreadHashesFromThreadInfos(
  threadInfos: $ReadOnlyArray<RawThreadInfo>,
  shouldConvert: boolean,
): { +[string]: number } {
  const threadHashes: { [string]: number } = {};

  for (const threadInfo of threadInfos) {
    threadHashes[threadInfo.id] = getThreadHashFromRawThreadInfo(
      threadInfo,
      shouldConvert,
    );
  }

  return threadHashes;
}

export { getThreadHashFromRawThreadInfo, getThreadHashesFromThreadInfos };
