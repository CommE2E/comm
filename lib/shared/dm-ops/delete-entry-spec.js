// @flow

import invariant from 'invariant';
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
  const { threadID, creatorID, time, entryID, entryDate, prevText } =
    dmOperation;
  return {
    type: messageTypes.DELETE_ENTRY,
    threadID,
    creatorID,
    time,
    entryID,
    date: entryDate,
    text: prevText,
  };
}

const deleteEntrySpec: DMOperationSpec<DMDeleteEntryOperation> = Object.freeze({
  notificationsCreationData: async (dmOperation: DMDeleteEntryOperation) => {
    const messageData = createMessageDataFromDMOperation(dmOperation);
    return { messageDatas: [messageData] };
  },
  processDMOperation: async (
    dmOperation: DMDeleteEntryOperation,
    viewerID: string,
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

    if (timestamp < time) {
      rawEntryInfoToUpdate = {
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
    }

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
