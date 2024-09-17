// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMSendReactionMessageOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDataFromDMOperation(
  dmOperation: DMSendReactionMessageOperation,
) {
  const { threadID, creatorID, time, targetMessageID, reaction, action } =
    dmOperation;
  return {
    type: messageTypes.REACTION,
    threadID,
    creatorID,
    time,
    targetMessageID,
    reaction,
    action,
  };
}

const sendReactionMessageSpec: DMOperationSpec<DMSendReactionMessageOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMSendReactionMessageOperation,
    ) => {
      const messageData = createMessageDataFromDMOperation(dmOperation);
      return { messageDatas: [messageData] };
    },
    processDMOperation: async (dmOperation: DMSendReactionMessageOperation) => {
      const { messageID } = dmOperation;
      const messageData = createMessageDataFromDMOperation(dmOperation);
      const rawMessageInfos = [
        rawMessageInfoFromMessageData(messageData, messageID),
      ];

      return {
        rawMessageInfos,
        updateInfos: [],
      };
    },
    canBeProcessed: async (
      dmOperation: DMSendReactionMessageOperation,
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

export { sendReactionMessageSpec };
