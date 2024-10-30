// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import {
  type DMDeleteEntryOperation,
  dmDeleteEntryOperationValidator,
} from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { EntryUpdateInfo } from '../../types/update-types.js';
import { dateFromString } from '../../utils/date-utils.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDataWithInfoFromDMOperation(
  dmOperation: DMDeleteEntryOperation,
) {
  const { threadID, creatorID, time, entryID, entryDate, prevText, messageID } =
    dmOperation;
  const messageData = {
    type: messageTypes.DELETE_ENTRY,
    threadID,
    creatorID,
    time,
    entryID,
    date: entryDate,
    text: prevText,
  };
  const rawMessageInfo = rawMessageInfoFromMessageData(messageData, messageID);
  return { rawMessageInfo, messageData };
}

const deleteEntrySpec: DMOperationSpec<DMDeleteEntryOperation> = Object.freeze({
  processDMOperation: async (
    dmOperation: DMDeleteEntryOperation,
    utilities: ProcessDMOperationUtilities,
  ) => {
    const {
      threadID,
      creatorID,
      time,
      creationTime,
      entryID,
      entryDate: dateString,
      prevText,
    } = dmOperation;

    const rawEntryInfo = utilities.entryInfos[entryID];
    const messageDataWithMessageInfos =
      createMessageDataWithInfoFromDMOperation(dmOperation);
    const { rawMessageInfo } = messageDataWithMessageInfos;
    const rawMessageInfos = [rawMessageInfo];

    invariant(rawEntryInfo?.thick, 'Entry thread should be thick');
    const timestamp = rawEntryInfo.lastUpdatedTime;

    const notificationsCreationData = {
      messageDatasWithMessageInfos: [messageDataWithMessageInfos],
      rawThreadInfos: {
        [threadID]: utilities.threadInfos[threadID],
      },
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
      text: prevText,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      creationTime,
      creatorID,
      thick: true,
      deleted: true,
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
    dmOperation: DMDeleteEntryOperation,
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
  operationValidator: dmDeleteEntryOperationValidator,
});

export { deleteEntrySpec };
