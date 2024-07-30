// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import { createUpdateUnreadCountUpdate } from './dm-op-utils.js';
import type { DMRemoveMembersOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { threadTypes } from '../../types/thread-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';

const removeMembersSpec: DMOperationSpec<DMRemoveMembersOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMRemoveMembersOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { editorID, time, messageID, threadID, removedUserIDs } =
        dmOperation;

      const threadInfo = utilities.threadInfos[threadID];
      invariant(threadInfo.thick, 'Thread should be thick');

      const removeMembersMessage = {
        type: messageTypes.REMOVE_MEMBERS,
        id: messageID,
        threadID,
        time,
        creatorID: editorID,
        removedUserIDs: [...removedUserIDs],
      };

      const removedUserIDsSet = new Set(removedUserIDs);
      const viewerIsRemoved = removedUserIDsSet.has(viewerID);
      const updateInfos: Array<ClientUpdateInfo> = [];
      if (
        viewerIsRemoved &&
        (threadInfo.type !== threadTypes.THICK_SIDEBAR ||
          (threadInfo.parentThreadID &&
            !utilities.threadInfos[threadInfo.parentThreadID]))
      ) {
        updateInfos.push({
          type: updateTypes.DELETE_THREAD,
          id: uuid.v4(),
          time,
          threadID,
        });
      } else {
        const updatedThreadInfo = {
          ...threadInfo,
          members: threadInfo.members.filter(
            member => !removedUserIDsSet.has(member.id),
          ),
        };
        const updateWithRepliesCount = createUpdateUnreadCountUpdate(
          updatedThreadInfo,
          [removeMembersMessage],
        );
        updateInfos.push(
          updateWithRepliesCount ?? {
            type: updateTypes.UPDATE_THREAD,
            id: uuid.v4(),
            time,
            threadInfo: updatedThreadInfo,
          },
          {
            type: updateTypes.UPDATE_THREAD_READ_STATUS,
            id: uuid.v4(),
            time,
            threadID,
            unread: true,
          },
        );
      }
      return {
        rawMessageInfos: [removeMembersMessage],
        updateInfos,
      };
    },
    canBeProcessed(
      dmOperation: DMRemoveMembersOperation,
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

export { removeMembersSpec };
