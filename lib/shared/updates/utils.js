// @flow

import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';

function identifyInvalidatedThreads(
  updateInfos: $ReadOnlyArray<ClientUpdateInfo>,
): Set<string> {
  const invalidated = new Set<string>();
  for (const updateInfo of updateInfos) {
    if (updateInfo.type === updateTypes.DELETE_THREAD) {
      invalidated.add(updateInfo.threadID);
    }
  }
  return invalidated;
}

export { identifyInvalidatedThreads };
