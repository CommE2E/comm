// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMRemoveMembersOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { threadTypes } from '../../types/thread-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createMessageDataFromDMOperation(
  dmOperation: DMRemoveMembersOperation,
) {
  const { editorID, time, threadID, removedUserIDs } = dmOperation;
  return {
    type: messageTypes.REMOVE_MEMBERS,
    threadID,
    time,
    creatorID: editorID,
    removedUserIDs: [...removedUserIDs],
  };
}

const removeMembersSpec: DMOperationSpec<DMRemoveMembersOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMRemoveMembersOperation,
    ) => {
      const messageData = createMessageDataFromDMOperation(dmOperation);
      return { messageDatas: [messageData] };
    },
    processDMOperation: async (
      dmOperation: DMRemoveMembersOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { time, messageID, threadID, removedUserIDs } = dmOperation;

      const threadInfo = utilities.threadInfos[threadID];
      invariant(threadInfo.thick, 'Thread should be thick');

      const messageData = createMessageDataFromDMOperation(dmOperation);
      const rawMessageInfos = [
        rawMessageInfoFromMessageData(messageData, messageID),
      ];

      const memberTimestamps = { ...threadInfo.timestamps.members };
      const removedUserIDsSet = new Set<string>();
      for (const userID of removedUserIDs) {
        if (!memberTimestamps[userID]) {
          memberTimestamps[userID] = {
            isMember: time,
            subscription: threadInfo.creationTime,
          };
        }

        if (memberTimestamps[userID].isMember > time) {
          continue;
        }

        memberTimestamps[userID] = {
          ...memberTimestamps[userID],
          isMember: time,
        };

        removedUserIDsSet.add(userID);
      }

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
          timestamps: {
            ...threadInfo.timestamps,
            members: memberTimestamps,
          },
        };
        updateInfos.push({
          type: updateTypes.UPDATE_THREAD,
          id: uuid.v4(),
          time,
          threadInfo: updatedThreadInfo,
        });
      }
      return {
        rawMessageInfos,
        updateInfos,
      };
    },
    canBeProcessed: async (
      dmOperation: DMRemoveMembersOperation,
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
    supportsAutoRetry: true,
  });

export { removeMembersSpec };
