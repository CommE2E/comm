// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMEditEntryOperation } from '../../types/dm-ops.js';
import type { ThickRawEntryInfo } from '../../types/entry-types.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { EntryUpdateInfo } from '../../types/update-types.js';
import { dateFromString } from '../../utils/date-utils.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDataFromDMOperation(dmOperation: DMEditEntryOperation) {
  const { threadID, creatorID, creationTime, entryID, entryDate, text } =
    dmOperation;
  return {
    type: messageTypes.EDIT_ENTRY,
    threadID,
    creatorID,
    entryID,
    time: creationTime,
    date: entryDate,
    text,
  };
}

const editEntrySpec: DMOperationSpec<DMEditEntryOperation> = Object.freeze({
  notificationsCreationData: async (dmOperation: DMEditEntryOperation) => {
    const messageData = createMessageDataFromDMOperation(dmOperation);
    return { messageDatas: [messageData] };
  },
  processDMOperation: async (
    dmOperation: DMEditEntryOperation,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) => {
    const {
      threadID,
      creatorID,
      creationTime,
      lastUpdatedTime,
      entryID,
      entryDate: dateString,
      text,
      messageID,
    } = dmOperation;

    const rawEntryInfo = utilities.entryInfos[entryID];

    const messageData = createMessageDataFromDMOperation(dmOperation);
    const rawMessageInfos = [
      rawMessageInfoFromMessageData(messageData, messageID),
    ];

    invariant(rawEntryInfo?.thick, 'Entry thread should be thick');
    let rawEntryInfoToUpdate: ThickRawEntryInfo = rawEntryInfo;
    const date = dateFromString(dateString);

    const timestamp = rawEntryInfoToUpdate.lastUpdatedTime;

    if (timestamp < lastUpdatedTime) {
      rawEntryInfoToUpdate = {
        id: entryID,
        threadID,
        text,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        creationTime,
        creatorID,
        thick: true,
        deleted: false,
        lastUpdatedTime,
      };
    }

    const entryUpdateInfo: EntryUpdateInfo = {
      entryInfo: rawEntryInfoToUpdate,
      type: updateTypes.UPDATE_ENTRY,
      id: uuid.v4(),
      time: lastUpdatedTime,
    };

    return {
      rawMessageInfos,
      updateInfos: [entryUpdateInfo],
    };
  },
  canBeProcessed(
    dmOperation: DMEditEntryOperation,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) {
    if (utilities.threadInfos[dmOperation.threadID]) {
      return { isProcessingPossible: true };
    }
    return {
      isProcessingPossible: false,
      reason: {
        type: 'missing_thread',
        threadID: dmOperation.threadID,
      },
    };
  },
  supportsAutoRetry: true,
});

export { editEntrySpec };
