// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMLeaveThreadOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { threadTypes } from '../../types/thread-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';
import { userIsMember } from '../thread-utils.js';

function createMessageDataFromDMOperation(dmOperation: DMLeaveThreadOperation) {
  const { editorID, time, threadID } = dmOperation;
  return {
    type: messageTypes.LEAVE_THREAD,
    threadID,
    creatorID: editorID,
    time,
  };
}

const leaveThreadSpec: DMOperationSpec<DMLeaveThreadOperation> = Object.freeze({
  notificationsCreationData: async (dmOperation: DMLeaveThreadOperation) => {
    const messageData = createMessageDataFromDMOperation(dmOperation);
    return { messageDatas: [messageData] };
  },
  processDMOperation: async (
    dmOperation: DMLeaveThreadOperation,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) => {
    const { editorID, time, messageID, threadID } = dmOperation;

    const threadInfo = utilities.threadInfos[threadID];
    invariant(threadInfo.thick, 'Thread should be thick');

    const messageData = createMessageDataFromDMOperation(dmOperation);
    const rawMessageInfos = [
      rawMessageInfoFromMessageData(messageData, messageID),
    ];

    if (
      viewerID === editorID &&
      userIsMember(threadInfo, editorID) &&
      (threadInfo.type !== threadTypes.THICK_SIDEBAR ||
        (threadInfo.parentThreadID &&
          !utilities.threadInfos[threadInfo.parentThreadID]))
    ) {
      return {
        rawMessageInfos,
        updateInfos: [
          {
            type: updateTypes.DELETE_THREAD,
            id: uuid.v4(),
            time,
            threadID,
          },
        ],
      };
    }
    const memberTimestamps = { ...threadInfo.timestamps.members };
    if (!memberTimestamps[editorID]) {
      memberTimestamps[editorID] = {
        isMember: time,
        subscription: threadInfo.creationTime,
      };
    }
    const shouldRemoveEditor = memberTimestamps[editorID].isMember <= time;
    memberTimestamps[editorID] = {
      ...memberTimestamps[editorID],
      isMember: time,
    };
    const updatedThreadInfo = {
      ...threadInfo,
      members: shouldRemoveEditor
        ? threadInfo.members.filter(member => member.id !== editorID)
        : threadInfo.members,
      timestamps: {
        ...threadInfo.timestamps,
        members: memberTimestamps,
      },
    };
    return {
      rawMessageInfos,
      updateInfos: [
        {
          type: updateTypes.UPDATE_THREAD,
          id: uuid.v4(),
          time,
          threadInfo: updatedThreadInfo,
        },
      ],
    };
  },
  canBeProcessed(
    dmOperation: DMLeaveThreadOperation,
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
  supportsAutoRetry: true,
});

export { leaveThreadSpec };
