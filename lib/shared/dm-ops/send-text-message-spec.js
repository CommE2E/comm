// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import {
  type DMSendTextMessageOperation,
  dmSendTextMessageOperationValidator,
} from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDataWithInfoFromDMOperation(
  dmOperation: DMSendTextMessageOperation,
) {
  const { threadID, creatorID, time, text, messageID } = dmOperation;
  const messageData = {
    type: messageTypes.TEXT,
    threadID,
    creatorID,
    time,
    text,
  };
  const rawMessageInfo = rawMessageInfoFromMessageData(messageData, messageID);
  return { messageData, rawMessageInfo };
}

const sendTextMessageSpec: DMOperationSpec<DMSendTextMessageOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMSendTextMessageOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const messageDataWithMessageInfos =
        createMessageDataWithInfoFromDMOperation(dmOperation);
      const { rawMessageInfo } = messageDataWithMessageInfos;
      const rawMessageInfos = [rawMessageInfo];
      const updateInfos: Array<ClientUpdateInfo> = [];

      const notificationsCreationData = {
        messageDatasWithMessageInfos: [messageDataWithMessageInfos],
        thickRawThreadInfos: {
          [dmOperation.threadID]: utilities.threadInfos[dmOperation.threadID],
        },
      };

      return {
        rawMessageInfos,
        updateInfos,
        blobOps: [],
        notificationsCreationData,
      };
    },
    canBeProcessed: async (
      dmOperation: DMSendTextMessageOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      if (!utilities.threadInfos[dmOperation.threadID]) {
        return {
          isProcessingPossible: false,
          reason: {
            type: 'missing_thread',
            threadID: dmOperation.threadID,
          },
        };
      }
      return { isProcessingPossible: true };
    },
    supportsAutoRetry: false,
    operationValidator: dmSendTextMessageOperationValidator,
  });

export { sendTextMessageSpec };
