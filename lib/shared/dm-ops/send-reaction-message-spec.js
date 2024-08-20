// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMSendReactionMessageOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDatasFromDMOperation(
  dmOperation: DMSendReactionMessageOperation,
) {
  const { threadID, creatorID, time, targetMessageID, reaction, action } =
    dmOperation;
  return [
    {
      type: messageTypes.REACTION,
      threadID,
      creatorID,
      time,
      targetMessageID,
      reaction,
      action,
    },
  ];
}

const sendReactionMessageSpec: DMOperationSpec<DMSendReactionMessageOperation> =
  Object.freeze({
    messageDataFromDMOperation: async (
      dmOperation: DMSendReactionMessageOperation,
    ) => {
      return createMessageDatasFromDMOperation(dmOperation);
    },
    processDMOperation: async (dmOperation: DMSendReactionMessageOperation) => {
      const { messageID } = dmOperation;
      const messageDatas = createMessageDatasFromDMOperation(dmOperation);
      const rawMessageInfos = messageDatas.map(messageData =>
        rawMessageInfoFromMessageData(messageData, messageID),
      );

      return {
        rawMessageInfos,
        updateInfos: [],
      };
    },
    canBeProcessed(
      dmOperation: DMSendReactionMessageOperation,
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
  });

export { sendReactionMessageSpec };
