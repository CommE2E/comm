// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMSendEditMessageOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDatasFromDMOperation(
  dmOperation: DMSendEditMessageOperation,
) {
  const { threadID, creatorID, time, targetMessageID, text } = dmOperation;
  return [
    {
      type: messageTypes.EDIT_MESSAGE,
      threadID,
      creatorID,
      time,
      targetMessageID,
      text,
    },
  ];
}

const sendEditMessageSpec: DMOperationSpec<DMSendEditMessageOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMSendEditMessageOperation,
    ) => {
      const messageDatas = createMessageDatasFromDMOperation(dmOperation);
      return { messageDatas };
    },
    processDMOperation: async (dmOperation: DMSendEditMessageOperation) => {
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
      dmOperation: DMSendEditMessageOperation,
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

export { sendEditMessageSpec };
