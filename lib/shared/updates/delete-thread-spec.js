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
  });
