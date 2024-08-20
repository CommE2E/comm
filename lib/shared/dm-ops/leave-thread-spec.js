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
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';
import { userIsMember } from '../thread-utils.js';

function createMessageDatasFromDMOperation(
  dmOperation: DMLeaveThreadOperation,
) {
  const { editorID, time, threadID } = dmOperation;
  return [
    {
      type: messageTypes.LEAVE_THREAD,
      threadID,
      creatorID: editorID,
      time,
    },
  ];
}

const leaveThreadSpec: DMOperationSpec<DMLeaveThreadOperation> = Object.freeze({
  messageDataFromDMOperation: async (dmOperation: DMLeaveThreadOperation) => {
    return createMessageDatasFromDMOperation(dmOperation);
  },
  processDMOperation: async (
    dmOperation: DMLeaveThreadOperation,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) => {
    const { editorID, time, messageID, threadID } = dmOperation;

    const threadInfo = utilities.threadInfos[threadID];
    invariant(threadInfo.thick, 'Thread should be thick');

    const messageDatas = createMessageDatasFromDMOperation(dmOperation);
    const rawMessageInfos = messageDatas.map(messageData =>
      rawMessageInfoFromMessageData(messageData, messageID),
    );

    const updateInfos: Array<ClientUpdateInfo> = [];
    if (
      viewerID === editorID &&
      userIsMember(threadInfo, editorID) &&
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
        members: threadInfo.members.filter(member => member.id !== editorID),
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
});

export { leaveThreadSpec };
