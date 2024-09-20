// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMSendEditMessageOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDataWithInfoFromDMOperation(
  dmOperation: DMSendEditMessageOperation,
) {
  const { threadID, creatorID, time, targetMessageID, text, messageID } =
    dmOperation;
  const messageData = {
    type: messageTypes.EDIT_MESSAGE,
    threadID,
    creatorID,
    time,
    targetMessageID,
    text,
  };
  const rawMessageInfo = rawMessageInfoFromMessageData(messageData, messageID);
  return { messageData, rawMessageInfo };
}

const sendEditMessageSpec: DMOperationSpec<DMSendEditMessageOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMSendEditMessageOperation,
    ) => {
      return {
        messageDatasWithMessageInfos: [
          createMessageDataWithInfoFromDMOperation(dmOperation),
        ],
      };
    },
    processDMOperation: async (dmOperation: DMSendEditMessageOperation) => {
      const { rawMessageInfo } =
        createMessageDataWithInfoFromDMOperation(dmOperation);
      const rawMessageInfos = [rawMessageInfo];

      return {
        rawMessageInfos,
        updateInfos: [],
      };
    },
    canBeProcessed: async (
      dmOperation: DMSendEditMessageOperation,
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
