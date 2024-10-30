// @flow

import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import {
  type DMCreateEntryOperation,
  dmCreateEntryOperationValidator,
} from '../../types/dm-ops.js';
import type { ThickRawEntryInfo } from '../../types/entry-types.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { EntryUpdateInfo } from '../../types/update-types.js';
import { dateFromString } from '../../utils/date-utils.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDataWithInfoFromDMOperation(
  dmOperation: DMCreateEntryOperation,
) {
  const { threadID, creatorID, time, entryID, entryDate, text, messageID } =
    dmOperation;
  const messageData = {
    type: messageTypes.CREATE_ENTRY,
    threadID,
    creatorID,
    time,
    entryID,
    date: entryDate,
    text,
  };
  const rawMessageInfo = rawMessageInfoFromMessageData(messageData, messageID);
  return { rawMessageInfo, messageData };
}

const createEntrySpec: DMOperationSpec<DMCreateEntryOperation> = Object.freeze({
  processDMOperation: async (
    dmOperation: DMCreateEntryOperation,
    utilities: ProcessDMOperationUtilities,
  ) => {
    const { threadID, creatorID, time, entryID, entryDate, text } = dmOperation;

    const messageDataWithMessageInfos =
      createMessageDataWithInfoFromDMOperation(dmOperation);
    const { rawMessageInfo } = messageDataWithMessageInfos;
    const rawMessageInfos = [rawMessageInfo];

    const date = dateFromString(entryDate);
    const rawEntryInfo: ThickRawEntryInfo = {
      id: entryID,
      threadID,
      text,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      creationTime: time,
      creatorID,
      thick: true,
      deleted: false,
      lastUpdatedTime: time,
    };

    const entryUpdateInfo: EntryUpdateInfo = {
      entryInfo: rawEntryInfo,
      type: updateTypes.UPDATE_ENTRY,
      id: uuid.v4(),
      time,
    };

    const notificationsCreationData = {
      messageDatasWithMessageInfos: [messageDataWithMessageInfos],
      rawThreadInfos: {
        [threadID]: utilities.threadInfos[threadID],
      },
    };

    return {
      rawMessageInfos,
      updateInfos: [entryUpdateInfo],
      blobOps: [],
      notificationsCreationData,
    };
  },
  canBeProcessed: async (
    dmOperation: DMCreateEntryOperation,
    utilities: ProcessDMOperationUtilities,
  ) => {
    if (utilities.entryInfos[dmOperation.entryID]) {
      console.log(
        'Discarded a CREATE_ENTRY operation because entry with ' +
          `the same ID ${dmOperation.entryID} already exists in the store`,
      );
      return {
        isProcessingPossible: false,
        reason: {
          type: 'invalid',
        },
      };
    }
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
  operationValidator: dmCreateEntryOperationValidator,
});

export { createEntrySpec };
