// @flow

import t from 'tcomb';

import type { UpdateSpec } from './update-spec.js';
import { createReplaceThreadOperation } from '../../ops/create-replace-thread-operation.js';
import type { RawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type {
  LegacyRawThreadInfo,
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
    const storeThreadInfo = storeThreadInfos[update.threadID];

    let updatedThread;
    if (storeThreadInfo.timestamps) {
      updatedThread = {
        ...storeThreadInfo,
        currentUser: {
          ...storeThreadInfo.currentUser,
          unread: update.unread,
        },
        timestamps: {
          ...storeThreadInfo.timestamps,
          currentUser: {
            ...storeThreadInfo.timestamps.currentUser,
            unread: update.time,
          },
        },
      };
    } else if (storeThreadInfo.minimallyEncoded) {
      updatedThread = {
        ...storeThreadInfo,
        currentUser: {
          ...storeThreadInfo.currentUser,
          unread: update.unread,
        },
      };
    } else {
      updatedThread = {
        ...storeThreadInfo,
        currentUser: {
          ...storeThreadInfo.currentUser,
          unread: update.unread,
        },
      };
    }
    return [createReplaceThreadOperation(update.threadID, updatedThread)];
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
  getUpdatedThreadInfo(
    update: ThreadReadStatusUpdateInfo,
    threadInfos: {
      +[string]: LegacyRawThreadInfo | RawThreadInfo,
    },
  ): ?(LegacyRawThreadInfo | RawThreadInfo) {
    const threadInfo = threadInfos[update.threadID];
    if (!threadInfo) {
      return null;
    }
    if (threadInfo.minimallyEncoded) {
      return {
        ...threadInfo,
        currentUser: {
          ...threadInfo.currentUser,
          unread: update.unread,
        },
      };
    }
    return {
      ...threadInfo,
      currentUser: {
        ...threadInfo.currentUser,
        unread: update.unread,
      },
    };
  },
});
