// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMSendEditMessageOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDataFromDMOperation(
  dmOperation: DMSendEditMessageOperation,
) {
  const { threadID, creatorID, time, targetMessageID, text } = dmOperation;
  return {
    type: messageTypes.EDIT_MESSAGE,
    threadID,
    creatorID,
    time,
    targetMessageID,
    text,
  };
}

const sendEditMessageSpec: DMOperationSpec<DMSendEditMessageOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMSendEditMessageOperation,
    ) => {
      const messageData = createMessageDataFromDMOperation(dmOperation);
      return { messageDatas: [messageData] };
    },
    processDMOperation: async (dmOperation: DMSendEditMessageOperation) => {
      const { messageID } = dmOperation;
      const messageData = createMessageDataFromDMOperation(dmOperation);
      const rawMessageInfos = [
        rawMessageInfoFromMessageData(messageData, messageID),
      ];

      return {
        rawMessageInfos,
        updateInfos: [],
        blobOps: [],
      };
    },
    canBeProcessed: async (
      dmOperation: DMSendEditMessageOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const message = await utilities.fetchMessage(dmOperation.targetMessageID);
      if (!message) {
        return {
          isProcessingPossible: false,
          reason: {
            type: 'missing_message',
            messageID: dmOperation.targetMessageID,
          },
        };
      }
      return {
        isProcessingPossible: true,
      };
    },
    supportsAutoRetry: true,
  });

export { sendEditMessageSpec };
