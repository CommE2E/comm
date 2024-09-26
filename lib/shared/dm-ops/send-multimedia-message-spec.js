// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import {
  encryptedMediaBlobURI,
  encryptedVideoThumbnailBlobURI,
} from '../../media/media-utils.js';
import type {
  DMSendMultimediaMessageOperation,
  DMBlobOperation,
} from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { blobHashFromBlobServiceURI } from '../../utils/blob-service.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDataWithInfoFromDMOperation(
  dmOperation: DMSendMultimediaMessageOperation,
) {
  const { threadID, creatorID, time, media, messageID } = dmOperation;
  const messageData = {
    type: messageTypes.MULTIMEDIA,
    threadID,
    creatorID,
    time,
    media,
  };
  const rawMessageInfo = rawMessageInfoFromMessageData(messageData, messageID);
  return { messageData, rawMessageInfo };
}

function getBlobOpsFromOperation(
  dmOperation: DMSendMultimediaMessageOperation,
): Array<DMBlobOperation> {
  const ops: Array<DMBlobOperation> = [];

  for (const media of dmOperation.media) {
    if (media.type !== 'encrypted_photo' && media.type !== 'encrypted_video') {
      continue;
    }
    const blobURI = encryptedMediaBlobURI(media);
    ops.push({
      type: 'establish_holder',
      blobHash: blobHashFromBlobServiceURI(blobURI),
      dmOpType: 'inbound_only',
    });
    if (media.type === 'encrypted_video') {
      const thumbnailBlobURI = encryptedVideoThumbnailBlobURI(media);
      ops.push({
        type: 'establish_holder',
        blobHash: blobHashFromBlobServiceURI(thumbnailBlobURI),
        dmOpType: 'inbound_only',
      });
    }
  }

  return ops;
}

const sendMultimediaMessageSpec: DMOperationSpec<DMSendMultimediaMessageOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMSendMultimediaMessageOperation,
    ) => {
      return {
        messageDatasWithMessageInfos: [
          createMessageDataWithInfoFromDMOperation(dmOperation),
        ],
      };
    },
    processDMOperation: async (
      dmOperation: DMSendMultimediaMessageOperation,
    ) => {
      const { rawMessageInfo } =
        createMessageDataWithInfoFromDMOperation(dmOperation);
      const rawMessageInfos = [rawMessageInfo];
      const updateInfos: Array<ClientUpdateInfo> = [];
      const blobOps = getBlobOpsFromOperation(dmOperation);
      return {
        rawMessageInfos,
        updateInfos,
        blobOps,
      };
    },
    canBeProcessed: async (
      dmOperation: DMSendMultimediaMessageOperation,
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
  });

export { sendMultimediaMessageSpec };
