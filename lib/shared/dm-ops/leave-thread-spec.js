// @flow

import { uuid } from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMLeaveThreadOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type { ThickRawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { userIsMember } from '../thread-utils.js';

const leaveThreadSpec: DMOperationSpec<DMLeaveThreadOperation> = Object.freeze({
  processDMOperation: async (
    dmOperation: DMLeaveThreadOperation,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) => {
    const { editorID, time, messageID, threadID } = dmOperation;

    const threadInfoOptional = utilities.getThreadInfo(threadID);
    if (!threadInfoOptional || !threadInfoOptional.thick) {
      // We can't perform this operation now. It should be queued for later.
      return {
        rawMessageInfos: [],
        updateInfos: [],
      };
    }
    const threadInfo: ThickRawThreadInfo = threadInfoOptional;
    if (!userIsMember(threadInfo, editorID)) {
      return {
        rawMessageInfos: [],
        updateInfos: [],
      };
    }

    const leaveThreadMessage = {
      type: messageTypes.LEAVE_THREAD,
      id: messageID,
      threadID,
      creatorID: editorID,
      time,
    };

    const updateInfos: Array<ClientUpdateInfo> = [];
    if (viewerID === editorID) {
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
      rawMessageInfos: [leaveThreadMessage],
      updateInfos,
    };
  },
});

export { leaveThreadSpec };
