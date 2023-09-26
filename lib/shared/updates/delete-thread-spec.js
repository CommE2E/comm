// @flow

import type { UpdateSpec } from './update-spec.js';
import type { RawThreadInfos } from '../../types/thread-types.js';
import type { ThreadDeletionUpdateInfo } from '../../types/update-types.js';

export const deleteThreadSpec: UpdateSpec<ThreadDeletionUpdateInfo> =
  Object.freeze({
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
      return new Set(
        [...filteredThreadIDs].filter(id => id !== update.threadID),
      );
    },
  });
