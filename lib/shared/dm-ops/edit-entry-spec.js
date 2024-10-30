// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import {
  type DMEditEntryOperation,
  dmEditEntryOperationValidator,
} from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { EntryUpdateInfo } from '../../types/update-types.js';
import { dateFromString } from '../../utils/date-utils.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDataWithInfoFromDMOperation(
  dmOperation: DMEditEntryOperation,
) {
  const { threadID, creatorID, time, entryID, entryDate, text, messageID } =
    dmOperation;
  const messageData = {
    type: messageTypes.EDIT_ENTRY,
    threadID,
    creatorID,
    entryID,
    time,
    date: entryDate,
    text,
  };
  const rawMessageInfo = rawMessageInfoFromMessageData(messageData, messageID);
  return { messageData, rawMessageInfo };
}

const editEntrySpec: DMOperationSpec<DMEditEntryOperation> = Object.freeze({
  processDMOperation: async (
    dmOperation: DMEditEntryOperation,
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
    } = dmOperation;

    const rawEntryInfo = utilities.entryInfos[entryID];

    const messageDataWithMessageInfos =
      createMessageDataWithInfoFromDMOperation(dmOperation);
    const { rawMessageInfo } = messageDataWithMessageInfos;
    const rawMessageInfos = [rawMessageInfo];

    invariant(rawEntryInfo?.thick, 'Entry should be thick');
    const timestamp = rawEntryInfo.lastUpdatedTime;

    const notificationsCreationData = {
      messageDatasWithMessageInfos: [messageDataWithMessageInfos],
    };

    if (timestamp > time) {
      return {
        rawMessageInfos,
        updateInfos: [],
        blobOps: [],
        notificationsCreationData,
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
      blobOps: [],
      notificationsCreationData,
    };
  },
  canBeProcessed: async (
    dmOperation: DMEditEntryOperation,
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
  operationValidator: dmEditEntryOperationValidator,
});

export { editEntrySpec };
