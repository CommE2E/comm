// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMSendMultimediaMessageOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type { MediaMessageData } from '../../types/messages/media.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDataFromDMOperation(
  dmOperation: DMSendMultimediaMessageOperation,
): MediaMessageData {
  const { threadID, creatorID, time, media } = dmOperation;
  return {
    type: messageTypes.MULTIMEDIA,
    threadID,
    creatorID,
    time,
    media,
  };
}

const sendMultimediaMessageSpec: DMOperationSpec<DMSendMultimediaMessageOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMSendMultimediaMessageOperation,
    ) => {
      const messageData = createMessageDataFromDMOperation(dmOperation);
      return { messageDatas: [messageData] };
    },
    processDMOperation: async (
      dmOperation: DMSendMultimediaMessageOperation,
    ) => {
      const { messageID } = dmOperation;
      const messageData = createMessageDataFromDMOperation(dmOperation);
      const rawMessageInfos = [
        rawMessageInfoFromMessageData(messageData, messageID),
      ];
      const updateInfos: Array<ClientUpdateInfo> = [];
      return {
        rawMessageInfos,
        updateInfos,
      };
    },
    canBeProcessed: async (
      dmOperation: DMSendMultimediaMessageOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) => {
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
    supportsAutoRetry: false,
  });

export { sendMultimediaMessageSpec };
