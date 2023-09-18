// @flow

import type { UpdateSpec } from './update-spec.js';
import type {
  RawThreadInfo,
  RawThreadInfos,
} from '../../types/thread-types.js';
import type { ThreadReadStatusUpdateInfo } from '../../types/update-types.js';

export const updateThreadReadStatusSpec: UpdateSpec<ThreadReadStatusUpdateInfo> =
  Object.freeze({
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
  });
