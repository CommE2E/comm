// @flow

import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import { createUpdateUnreadCountUpdate } from './dm-op-utils.js';
import type { DMSendEditMessageOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';

const sendEditMessageSpec: DMOperationSpec<DMSendEditMessageOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMSendEditMessageOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { threadID, creatorID, time, messageID, targetMessageID, text } =
        dmOperation;
      const editMessage = {
        type: messageTypes.EDIT_MESSAGE,
        id: messageID,
        threadID,
        creatorID,
        time,
        targetMessageID,
        text,
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
        editMessage,
      ]);
      if (repliesCountUpdate) {
        updateInfos.push(repliesCountUpdate);
      }
      return {
        rawMessageInfos: [editMessage],
        updateInfos,
      };
    },
    canBeApplied(
      dmOperation: DMSendEditMessageOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) {
      return !!utilities.threadInfos[dmOperation.threadID];
    },
  });

export { sendEditMessageSpec };
