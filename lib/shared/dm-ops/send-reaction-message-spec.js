// @flow

import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import { createUpdateUnreadCountUpdate } from './dm-op-utils.js';
import type { DMSendReactionMessageOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';

const sendReactionMessageSpec: DMOperationSpec<DMSendReactionMessageOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMSendReactionMessageOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const {
        threadID,
        creatorID,
        time,
        messageID,
        targetMessageID,
        reaction,
        action,
      } = dmOperation;
      const reactionMessage = {
        type: messageTypes.REACTION,
        id: messageID,
        threadID,
        creatorID,
        time,
        targetMessageID,
        reaction,
        action,
      };

      const updateInfos: Array<ClientUpdateInfo> = [];
      if (creatorID !== viewerID) {
        updateInfos.push({
          type: updateTypes.UPDATE_THREAD_READ_STATUS,
          id: uuid.v4(),
          time,
          threadID,
          unread: true,
        });
      }
      const threadInfo = utilities.threadInfos[threadID];
      const repliesCountUpdate = createUpdateUnreadCountUpdate(threadInfo, [
        reactionMessage,
      ]);
      if (repliesCountUpdate) {
        updateInfos.push(repliesCountUpdate);
      }
      return {
        rawMessageInfos: [reactionMessage],
        updateInfos,
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
