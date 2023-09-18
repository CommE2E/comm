// @flow

import type { UpdateSpec } from './update-spec.js';
import type { RawThreadInfos } from '../../types/thread-types.js';
import type { AccountDeletionUpdateInfo } from '../../types/update-types.js';

export const deleteAccountSpec: UpdateSpec<AccountDeletionUpdateInfo> =
  Object.freeze({
    generateOpsForThreadUpdates(
      storeThreadInfos: RawThreadInfos,
      update: AccountDeletionUpdateInfo,
    ) {
      const operations = [];
      for (const threadID in storeThreadInfos) {
        const threadInfo = storeThreadInfos[threadID];
        const newMembers = threadInfo.members.filter(
          member => member.id !== update.deletedUserID,
        );
        if (newMembers.length < threadInfo.members.length) {
          const updatedThread = {
            ...threadInfo,
            members: newMembers,
          };
          operations.push({
            type: 'replace',
            payload: {
              id: threadID,
              threadInfo: updatedThread,
            },
          });
        }
      }
      return operations;
    },
  });
