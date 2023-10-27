// @flow

import _isEqual from 'lodash/fp/isEqual.js';

import type { UpdateSpec } from './update-spec.js';
import type { RawThreadInfos } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type {
  ThreadUpdateInfo,
  ThreadRawUpdateInfo,
  ThreadUpdateData,
} from '../../types/update-types.js';
import { threadInFilterList } from '../thread-utils.js';

export const updateThreadSpec: UpdateSpec<
  ThreadUpdateInfo,
  ThreadRawUpdateInfo,
  ThreadUpdateData,
> = Object.freeze({
  generateOpsForThreadUpdates(
    storeThreadInfos: RawThreadInfos,
    update: ThreadUpdateInfo,
  ) {
    if (_isEqual(storeThreadInfos[update.threadInfo.id])(update.threadInfo)) {
      return null;
    }
    return [
      {
        type: 'replace',
        payload: {
          id: update.threadInfo.id,
          threadInfo: update.threadInfo,
        },
      },
    ];
  },
  reduceCalendarThreadFilters(
    filteredThreadIDs: $ReadOnlySet<string>,
    update: ThreadUpdateInfo,
  ) {
    if (
      threadInFilterList(update.threadInfo) ||
      !filteredThreadIDs.has(update.threadInfo.id)
    ) {
      return filteredThreadIDs;
    }
    return new Set(
      [...filteredThreadIDs].filter(id => id !== update.threadInfo.id),
    );
  },
  rawUpdateInfoFromRow(row: Object) {
    const { threadID } = JSON.parse(row.content);
    return {
      type: updateTypes.UPDATE_THREAD,
      id: row.id.toString(),
      time: row.time,
      threadID,
    };
  },
  updateContentForServerDB(data: ThreadUpdateData) {
    return JSON.stringify({ threadID: data.threadID });
  },
  entitiesToFetch(update: ThreadRawUpdateInfo) {
    return {
      threadID: update.threadID,
    };
  },
});
