// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import {
  type DMSendDeleteMessageOperation,
  dmSendDeleteMessageOperationValidator,
} from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';

const sendDeleteMessageSpec: DMOperationSpec<DMSendDeleteMessageOperation> =
  Object.freeze({
    processDMOperation: async (dmOperation: DMSendDeleteMessageOperation) => {
      const { threadID, creatorID, time, targetMessageID, messageID } =
        dmOperation;
      const rawMessageInfo = {
        type: messageTypes.DELETE_MESSAGE,
        threadID,
        creatorID,
        time,
        targetMessageID,
        id: messageID,
      };

      return {
        rawMessageInfos: [rawMessageInfo],
        updateInfos: [],
        blobOps: [],
        notificationsCreationData: null,
      };
    },
    canBeProcessed: async (
      dmOperation: DMSendDeleteMessageOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const targetMessage = await utilities.fetchMessage(
        dmOperation.targetMessageID,
      );
      if (!targetMessage) {
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
    operationValidator: dmSendDeleteMessageOperationValidator,
  });

export { sendDeleteMessageSpec };
