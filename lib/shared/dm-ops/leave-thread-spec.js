// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import { createPermissionsInfoForNonMembers } from './create-thread-spec.js';
import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import { permissionsToBitmaskHex } from '../../permissions/minimally-encoded-thread-permissions.js';
import type { DMLeaveThreadOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type { ThickRawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import { threadTypes } from '../../types/thread-types-enum.js';
import type { RawThreadInfos } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { values } from '../../utils/objects.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';
import { userIsMember } from '../thread-utils.js';

function createMessageDataWithInfoFromDMOperation(
  dmOperation: DMLeaveThreadOperation,
) {
  const { editorID, time, threadID, messageID } = dmOperation;
  const messageData = {
    type: messageTypes.LEAVE_THREAD,
    threadID,
    creatorID: editorID,
    time,
  };
  const rawMessageInfo = rawMessageInfoFromMessageData(messageData, messageID);
  return { messageData, rawMessageInfo };
}

function createLeaveThreadSubthreadsUpdates(
  dmOperation: DMLeaveThreadOperation,
  threadInfo: ThickRawThreadInfo,
  viewerID: string,
  threadInfos: RawThreadInfos,
): $ReadOnlyArray<ClientUpdateInfo> {
  const updates = [];
  for (const thread of values(threadInfos)) {
    if (thread.parentThreadID !== threadInfo.id) {
      continue;
    }

    updates.push({
      type: updateTypes.DELETE_THREAD,
      id: uuid.v4(),
      time: dmOperation.time,
      threadID: thread.id,
    });
  }

  return updates;
}

const leaveThreadSpec: DMOperationSpec<DMLeaveThreadOperation> = Object.freeze({
  notificationsCreationData: async (dmOperation: DMLeaveThreadOperation) => {
    return {
      messageDatasWithMessageInfos: [
        createMessageDataWithInfoFromDMOperation(dmOperation),
      ],
    };
  },
  processDMOperation: async (
    dmOperation: DMLeaveThreadOperation,
    utilities: ProcessDMOperationUtilities,
  ) => {
    const { editorID, time, threadID } = dmOperation;
    const { viewerID, threadInfos } = utilities;
    const threadInfo = threadInfos[threadID];
    invariant(threadInfo.thick, 'Thread should be thick');

    const { rawMessageInfo } =
      createMessageDataWithInfoFromDMOperation(dmOperation);
    const rawMessageInfos = [rawMessageInfo];

    if (
      viewerID === editorID &&
      userIsMember(threadInfo, editorID) &&
      (threadInfo.type !== threadTypes.THICK_SIDEBAR ||
        (threadInfo.parentThreadID && !threadInfos[threadInfo.parentThreadID]))
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
          ...createLeaveThreadSubthreadsUpdates(
            dmOperation,
            threadInfo,
            viewerID,
            threadInfos,
          ),
        ],
        blobOps: [],
      };
    }

    if (threadInfo.timestamps.members[editorID]?.isMember > time) {
      return {
        rawMessageInfos,
        updateInfos: [],
        blobOps: [],
      };
    }

    const memberTimestamps = { ...threadInfo.timestamps.members };
    if (!memberTimestamps[editorID]) {
      memberTimestamps[editorID] = {
        isMember: time,
        subscription: threadInfo.creationTime,
      };
    }
    memberTimestamps[editorID] = {
      ...memberTimestamps[editorID],
      isMember: time,
    };

    let currentUser = threadInfo.currentUser;
    if (editorID === viewerID) {
      const parentThreadID = threadInfo.parentThreadID;
      const parentThreadInfo = parentThreadID
        ? utilities.threadInfos[parentThreadID]
        : null;
      invariant(
        parentThreadInfo?.thick,
        'Parent thread should be present and thick',
      );
      const viewerMembershipPermissions = createPermissionsInfoForNonMembers(
        threadID,
        threadInfo.type,
        parentThreadInfo,
      );
      currentUser = {
        ...currentUser,
        role: null,
        permissions: permissionsToBitmaskHex(viewerMembershipPermissions),
      };
    }

    const updatedThreadInfo = {
      ...threadInfo,
      members: threadInfo.members.filter(member => member.id !== editorID),
      currentUser,
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
      blobOps: [],
    };
  },
  canBeProcessed: async (
    dmOperation: DMLeaveThreadOperation,
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

export { leaveThreadSpec };
