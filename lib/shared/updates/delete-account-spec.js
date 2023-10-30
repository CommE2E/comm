// @flow

import type { UpdateSpec } from './update-spec.js';
import type { RawThreadInfos } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type {
  AccountDeletionRawUpdateInfo,
  AccountDeletionUpdateData,
  AccountDeletionUpdateInfo,
} from '../../types/update-types.js';
import type { UserInfos } from '../../types/user-types.js';

export const deleteAccountSpec: UpdateSpec<
  AccountDeletionUpdateInfo,
  AccountDeletionRawUpdateInfo,
  AccountDeletionUpdateData,
> = Object.freeze({
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
  reduceUserInfos(state: UserInfos, update: AccountDeletionUpdateInfo) {
    const { deletedUserID } = update;
    if (!state[deletedUserID]) {
      return state;
    }
    const { [deletedUserID]: deleted, ...rest } = state;
    return rest;
  },
  rawUpdateInfoFromRow(row: Object) {
    const content = JSON.parse(row.content);
    return {
      type: updateTypes.DELETE_ACCOUNT,
      id: row.id.toString(),
      time: row.time,
      deletedUserID: content.deletedUserID,
    };
  },
  updateContentForServerDB(data: AccountDeletionUpdateData) {
    return JSON.stringify({ deletedUserID: data.deletedUserID });
  },
  updateInfoFromRawInfo(info: AccountDeletionRawUpdateInfo) {
    return {
      type: updateTypes.DELETE_ACCOUNT,
      id: info.id,
      time: info.time,
      deletedUserID: info.deletedUserID,
    };
  },
  deleteCondition: new Set([
    updateTypes.DELETE_ACCOUNT,
    updateTypes.UPDATE_USER,
  ]),
});
