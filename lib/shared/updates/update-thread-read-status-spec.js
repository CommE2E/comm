// @flow

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

export const updateThreadReadStatusSpec: UpdateSpec<
  ThreadReadStatusUpdateInfo,
  ThreadReadStatusRawUpdateInfo,
  ThreadReadStatusUpdateData,
> = Object.freeze({
  generateOpsForThreadUpdates(
    storeThreadInfos: RawThreadInfos,
    update: ThreadReadStatusUpdateInfo,
  ) {
    const storeThreadInfo: ?RawThreadInfo = storeThreadInfos[update.threadID];
    if (
      !storeThreadInfo ||
      storeThreadInfo.currentUser.unread === update.unread
    ) {
      return null;
    }
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
  updateInfoFromRawInfo(info: ThreadReadStatusRawUpdateInfo) {
    return {
      type: updateTypes.UPDATE_THREAD_READ_STATUS,
      id: info.id,
      time: info.time,
      threadID: info.threadID,
      unread: info.unread,
    };
  },
});
