// @flow

import t from 'tcomb';

import type { UpdateSpec } from './update-spec.js';
import type { RawThreadInfos } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type {
  ThreadDeletionRawUpdateInfo,
  ThreadDeletionUpdateData,
  ThreadDeletionUpdateInfo,
} from '../../types/update-types.js';
import { tID, tNumber, tShape } from '../../utils/validation-utils.js';

export const deleteThreadSpec: UpdateSpec<
  ThreadDeletionUpdateInfo,
  ThreadDeletionRawUpdateInfo,
  ThreadDeletionUpdateData,
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
  updateContentForServerDB(data: ThreadDeletionUpdateData) {
    const { threadID } = data;
    return JSON.stringify({ threadID });
  },
  rawInfoFromData(data: ThreadDeletionUpdateData, id: string) {
    return {
      type: updateTypes.DELETE_THREAD,
      id,
      time: data.time,
      threadID: data.threadID,
    };
  },
  updateInfoFromRawInfo(info: ThreadDeletionRawUpdateInfo) {
    return {
      type: updateTypes.DELETE_THREAD,
      id: info.id,
      time: info.time,
      threadID: info.threadID,
    };
  },
  deleteCondition: 'all_types',
  keyForUpdateData(data: ThreadDeletionUpdateData) {
    return data.threadID;
  },
  keyForUpdateInfo(info: ThreadDeletionUpdateInfo) {
    return info.threadID;
  },
  typesOfReplacedUpdatesForMatchingKey: 'all_types',
  infoValidator: tShape<ThreadDeletionUpdateInfo>({
    type: tNumber(updateTypes.DELETE_THREAD),
    id: t.String,
    time: t.Number,
    threadID: tID,
  }),
});
