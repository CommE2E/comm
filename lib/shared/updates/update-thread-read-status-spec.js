// @flow

import t from 'tcomb';

import type { UpdateSpec } from './update-spec.js';
import type {
  RawThreadInfo,
  RawThreadInfos,
} from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type {
  ThreadReadStatusUpdateInfo,
  ThreadReadStatusRawUpdateInfo,
  ThreadReadStatusUpdateData,
} from '../../types/update-types.js';
import { tID, tNumber, tShape } from '../../utils/validation-utils.js';

export const updateThreadReadStatusSpec: UpdateSpec<
  ThreadReadStatusUpdateInfo,
  ThreadReadStatusRawUpdateInfo,
  ThreadReadStatusUpdateData,
> = Object.freeze({
  generateOpsForThreadUpdates(
    storeThreadInfos: RawThreadInfos,
    update: ThreadReadStatusUpdateInfo,
  ) {
    if (
      !storeThreadInfos[update.threadID] ||
      storeThreadInfos[update.threadID].currentUser.unread === update.unread
    ) {
      return null;
    }
    const storeThreadInfo: RawThreadInfo = storeThreadInfos[update.threadID];
    // TODO (atul): Try to get rid of this ridiculous branching.
    if (storeThreadInfo.minimallyEncoded) {
      const updatedThread = {
        ...storeThreadInfo,
        currentUser: {
          ...storeThreadInfo.currentUser,
          unread: update.unread,
        },
      };
      return [
        {
          type: 'replace',
          payload: {
            id: update.threadID,
            threadInfo: updatedThread,
          },
        },
      ];
    } else {
      const updatedThread = {
        ...storeThreadInfo,
        currentUser: {
          ...storeThreadInfo.currentUser,
          unread: update.unread,
        },
      };
      return [
        {
          type: 'replace',
          payload: {
            id: update.threadID,
            threadInfo: updatedThread,
          },
        },
      ];
    }
  },
  rawUpdateInfoFromRow(row: Object) {
    const { threadID, unread } = JSON.parse(row.content);
    return {
      type: updateTypes.UPDATE_THREAD_READ_STATUS,
      id: row.id.toString(),
      time: row.time,
      threadID,
      unread,
    };
  },
  updateContentForServerDB(data: ThreadReadStatusUpdateData) {
    const { threadID, unread } = data;
    return JSON.stringify({ threadID, unread });
  },
  rawInfoFromData(data: ThreadReadStatusUpdateData, id: string) {
    return {
      type: updateTypes.UPDATE_THREAD_READ_STATUS,
      id,
      time: data.time,
      threadID: data.threadID,
      unread: data.unread,
    };
  },
  updateInfoFromRawInfo(info: ThreadReadStatusRawUpdateInfo) {
    return {
      type: updateTypes.UPDATE_THREAD_READ_STATUS,
      id: info.id,
      time: info.time,
      threadID: info.threadID,
      unread: info.unread,
    };
  },
  deleteCondition: new Set([updateTypes.UPDATE_THREAD_READ_STATUS]),
  keyForUpdateData(data: ThreadReadStatusUpdateData) {
    return data.threadID;
  },
  keyForUpdateInfo(info: ThreadReadStatusUpdateInfo) {
    return info.threadID;
  },
  typesOfReplacedUpdatesForMatchingKey: new Set([
    updateTypes.UPDATE_THREAD_READ_STATUS,
  ]),
  infoValidator: tShape<ThreadReadStatusUpdateInfo>({
    type: tNumber(updateTypes.UPDATE_THREAD_READ_STATUS),
    id: t.String,
    time: t.Number,
    threadID: tID,
    unread: t.Boolean,
  }),
});
