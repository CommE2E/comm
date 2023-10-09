// @flow

import type { UpdateSpec } from './update-spec.js';
import type { RawThreadInfos } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type {
  ThreadDeletionRawUpdateInfo,
  ThreadDeletionUpdateInfo,
} from '../../types/update-types.js';

export const deleteThreadSpec: UpdateSpec<
  ThreadDeletionUpdateInfo,
  ThreadDeletionRawUpdateInfo,
> = Object.freeze({
  generateOpsForThreadUpdates(
    storeThreadInfos: RawThreadInfos,
    update: ThreadDeletionUpdateInfo,
  ) {
    if (storeThreadInfos[update.threadID]) {
      return [
        {
          type: 'remove',
          payload: {
            ids: [update.threadID],
          },
        },
      ];
    }
    return null;
  },
  reduceCalendarThreadFilters(
    filteredThreadIDs: $ReadOnlySet<string>,
    update: ThreadDeletionUpdateInfo,
  ) {
    if (!filteredThreadIDs.has(update.threadID)) {
      return filteredThreadIDs;
    }
    return new Set([...filteredThreadIDs].filter(id => id !== update.threadID));
  },
  rawUpdateInfoFromRow(row: Object) {
    const { threadID } = JSON.parse(row.content);
    return {
      type: updateTypes.DELETE_THREAD,
      id: row.id.toString(),
      time: row.time,
      threadID,
    };
  },
});
