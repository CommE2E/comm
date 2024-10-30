// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import {
  type DMSendReactionMessageOperation,
  dmSendReactionMessageOperationValidator,
} from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDataWithInfoFromDMOperation(
  dmOperation: DMSendReactionMessageOperation,
) {
  const {
    threadID,
    creatorID,
    time,
    targetMessageID,
    reaction,
    action,
    messageID,
  } = dmOperation;
  const messageData = {
    type: messageTypes.REACTION,
    threadID,
    creatorID,
    time,
    targetMessageID,
    reaction,
    action,
  };
  const rawMessageInfo = rawMessageInfoFromMessageData(messageData, messageID);
  return { messageData, rawMessageInfo };
}

const sendReactionMessageSpec: DMOperationSpec<DMSendReactionMessageOperation> =
  Object.freeze({
    processDMOperation: async (dmOperation: DMSendReactionMessageOperation) => {
      const messageDataWithMessageInfos =
        createMessageDataWithInfoFromDMOperation(dmOperation);
      const { rawMessageInfo } = messageDataWithMessageInfos;
      const rawMessageInfos = [rawMessageInfo];

      const notificationsCreationData = {
        messageDatasWithMessageInfos: [messageDataWithMessageInfos],
      };

      return {
        rawMessageInfos,
        updateInfos: [],
        blobOps: [],
        notificationsCreationData,
      };
    },
    canBeProcessed: async (
      dmOperation: DMSendReactionMessageOperation,
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
    operationValidator: dmSendReactionMessageOperationValidator,
  });

export { sendReactionMessageSpec };
