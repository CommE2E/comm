// @flow

import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMDeleteEntryOperation } from '../../types/dm-ops.js';
import type { ThickRawEntryInfo } from '../../types/entry-types.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { EntryUpdateInfo } from '../../types/update-types.js';
import { dateFromString } from '../../utils/date-utils.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDataFromDMOperation(dmOperation: DMDeleteEntryOperation) {
  const { threadID, creatorID, time, entryID, entryDate, text } = dmOperation;
  return {
    type: messageTypes.DELETE_ENTRY,
    threadID,
    creatorID,
    time,
    entryID,
    date: entryDate,
    text,
  };
}

const deleteEntrySpec: DMOperationSpec<DMDeleteEntryOperation> = Object.freeze({
  notificationsCreationData: async (dmOperation: DMDeleteEntryOperation) => {
    const messageData = createMessageDataFromDMOperation(dmOperation);
    return { messageDatas: [messageData] };
  },
  processDMOperation: async (dmOperation: DMDeleteEntryOperation) => {
    const {
      threadID,
      creatorID,
      time,
      entryID,
      entryDate: dateString,
      text,
      messageID,
    } = dmOperation;

    const messageData = createMessageDataFromDMOperation(dmOperation);
    const rawMessageInfos = [
      rawMessageInfoFromMessageData(messageData, messageID),
    ];

    const date = dateFromString(dateString);
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
      deleted: true,
      lastUpdatedTime: time,
    };

    const entryUpdateInfo: EntryUpdateInfo = {
      entryInfo: rawEntryInfo,
      type: updateTypes.UPDATE_ENTRY,
      id: uuid.v4(),
      time,
    };

    return {
      rawMessageInfos,
      updateInfos: [entryUpdateInfo],
    };
  },
  canBeProcessed(
    dmOperation: DMDeleteEntryOperation,
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

export { deleteEntrySpec };
