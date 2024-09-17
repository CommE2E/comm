// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMEditEntryOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { EntryUpdateInfo } from '../../types/update-types.js';
import { dateFromString } from '../../utils/date-utils.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDataFromDMOperation(dmOperation: DMEditEntryOperation) {
  const { threadID, creatorID, time, entryID, entryDate, text } = dmOperation;
  return {
    type: messageTypes.EDIT_ENTRY,
    threadID,
    creatorID,
    entryID,
    time,
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
      time,
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
    const timestamp = rawEntryInfo.lastUpdatedTime;

    if (timestamp > time) {
      return {
        rawMessageInfos,
        updateInfos: [],
      };
    }

    const date = dateFromString(dateString);
    const rawEntryInfoToUpdate = {
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
      lastUpdatedTime: time,
    };

    const entryUpdateInfo: EntryUpdateInfo = {
      entryInfo: rawEntryInfoToUpdate,
      type: updateTypes.UPDATE_ENTRY,
      id: uuid.v4(),
      time,
    };

    return {
      rawMessageInfos,
      updateInfos: [entryUpdateInfo],
    };
  },
  canBeProcessed: async (
    dmOperation: DMEditEntryOperation,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) => {
    if (!utilities.entryInfos[dmOperation.entryID]) {
      return {
        isProcessingPossible: false,
        reason: {
          type: 'missing_entry',
          entryID: dmOperation.entryID,
        },
      };
    }
    return {
      isProcessingPossible: true,
    };
  },
  supportsAutoRetry: true,
});

export { editEntrySpec };
