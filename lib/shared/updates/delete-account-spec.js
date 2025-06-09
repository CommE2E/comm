// @flow

import t from 'tcomb';

import type { UpdateSpec } from './update-spec.js';
import { createReplaceThreadOperation } from '../../ops/create-replace-thread-operation.js';
import type { RawThreadInfos } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type {
  AccountDeletionRawUpdateInfo,
  AccountDeletionUpdateData,
  AccountDeletionUpdateInfo,
} from '../../types/update-types.js';
import { tNumber, tShape, tUserID } from '../../utils/validation-utils.js';

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

      let replacedThreadInfo;
      if (threadInfo.thick) {
        const newMembers = threadInfo.members.filter(
          member => member.id !== update.deletedUserID,
        );
        if (newMembers.length < threadInfo.members.length) {
          replacedThreadInfo = {
            ...threadInfo,
            members: newMembers,
          };
        }
      } else {
        const newMembers = threadInfo.members.filter(
          member => member.id !== update.deletedUserID,
        );
        if (newMembers.length < threadInfo.members.length) {
          replacedThreadInfo = {
            ...threadInfo,
            members: newMembers,
          };
        }
      }
      if (replacedThreadInfo) {
        operations.push(
          createReplaceThreadOperation(threadInfo.id, replacedThreadInfo),
        );
      }
    }
    return operations;
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
  rawInfoFromData(data: AccountDeletionUpdateData, id: string) {
    return {
      type: updateTypes.DELETE_ACCOUNT,
      id,
      time: data.time,
      deletedUserID: data.deletedUserID,
    };
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
  keyForUpdateData(data: AccountDeletionUpdateData) {
    return data.deletedUserID;
  },
  keyForUpdateInfo(info: AccountDeletionUpdateInfo) {
    return info.deletedUserID;
  },
  typesOfReplacedUpdatesForMatchingKey: 'all_types',
  generateOpsForUserInfoUpdates(update: AccountDeletionUpdateInfo) {
    return [{ type: 'remove_users', payload: { ids: [update.deletedUserID] } }];
  },
  infoValidator: tShape<AccountDeletionUpdateInfo>({
    type: tNumber(updateTypes.DELETE_ACCOUNT),
    id: t.String,
    time: t.Number,
    deletedUserID: tUserID,
  }),
});
