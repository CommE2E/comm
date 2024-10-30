// @flow

import uuid from 'uuid';

import { createPermissionsInfo } from './create-thread-spec.js';
import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import {
  type DMLeaveThreadOperation,
  dmLeaveThreadOperationValidator,
} from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type { ThickRawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import { minimallyEncodeThreadCurrentUserInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import { threadTypes } from '../../types/thread-types-enum.js';
import type { ThickRawThreadInfos } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { values } from '../../utils/objects.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

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

function createDeleteSubthreadsUpdates(
  dmOperation: DMLeaveThreadOperation,
  threadInfo: ThickRawThreadInfo,
  threadInfos: ThickRawThreadInfos,
): Array<ClientUpdateInfo> {
  const updates: Array<ClientUpdateInfo> = [];
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

function createLeaveSubthreadsUpdates(
  dmOperation: DMLeaveThreadOperation,
  threadInfo: ThickRawThreadInfo,
  threadInfos: ThickRawThreadInfos,
): Array<ClientUpdateInfo> {
  const updates: Array<ClientUpdateInfo> = [];
  for (const thread of values(threadInfos)) {
    if (thread.parentThreadID !== threadInfo.id) {
      continue;
    }

    const userID = dmOperation.editorID;
    let userTimestamps = thread.timestamps.members[userID];
    if (!userTimestamps) {
      userTimestamps = {
        isMember: thread.creationTime,
        subscription: thread.creationTime,
      };
    }

    if (userTimestamps.isMember > dmOperation.time) {
      continue;
    }

    const updatedThread = {
      ...thread,
      members: thread.members.filter(member => member.id !== userID),
      timestamps: {
        ...thread.timestamps,
        members: {
          ...thread.timestamps.members,
          [userID]: {
            ...userTimestamps,
            isMember: dmOperation.time,
          },
        },
      },
    };

    updates.push({
      type: updateTypes.UPDATE_THREAD,
      id: uuid.v4(),
      time: dmOperation.time,
      threadInfo: updatedThread,
    });
  }

  return updates;
}

const leaveThreadSpec: DMOperationSpec<DMLeaveThreadOperation> = Object.freeze({
  processDMOperation: async (
    dmOperation: DMLeaveThreadOperation,
    utilities: ProcessDMOperationUtilities,
  ) => {
    const { editorID, time, threadID } = dmOperation;
    const { viewerID, threadInfos } = utilities;
    const threadInfo = threadInfos[threadID];

    const messageDataWithMessageInfos =
      createMessageDataWithInfoFromDMOperation(dmOperation);
    const { rawMessageInfo } = messageDataWithMessageInfos;
    const rawMessageInfos = [rawMessageInfo];

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

    const notificationsCreationData = {
      messageDatasWithMessageInfos: [messageDataWithMessageInfos],
      rawThreadInfos: {
        [threadID]: threadInfo,
      },
    };

    if (viewerID === editorID) {
      if (threadInfo.timestamps.members[editorID]?.isMember > time) {
        return {
          rawMessageInfos,
          updateInfos: [],
          blobOps: [],
          notificationsCreationData,
        };
      }

      if (threadInfo.type !== threadTypes.THICK_SIDEBAR) {
        return {
          rawMessageInfos,
          updateInfos: [
            {
              type: updateTypes.DELETE_THREAD,
              id: uuid.v4(),
              time,
              threadID,
            },
            ...createDeleteSubthreadsUpdates(
              dmOperation,
              threadInfo,
              threadInfos,
            ),
          ],
          blobOps: [],
          notificationsCreationData,
        };
      }

      const parentThreadID = threadInfo.parentThreadID;
      const parentThreadInfo = parentThreadID
        ? utilities.threadInfos[parentThreadID]
        : null;
      if (parentThreadID && !parentThreadInfo) {
        console.log(
          `Parent thread with ID ${parentThreadID} was expected while ` +
            'leaving a thread but is missing from the store',
        );
      }
      const viewerMembershipPermissions = createPermissionsInfo(
        threadID,
        threadInfo.type,
        false,
        parentThreadInfo,
      );
      const { minimallyEncoded, permissions, ...currentUserInfo } =
        threadInfo.currentUser;
      const currentUser = minimallyEncodeThreadCurrentUserInfo({
        ...currentUserInfo,
        role: null,
        permissions: viewerMembershipPermissions,
      });

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
        notificationsCreationData,
      };
    }

    const updateInfos = createLeaveSubthreadsUpdates(
      dmOperation,
      threadInfo,
      threadInfos,
    );

    // It is possible that the editor has joined this thread after leaving it,
    // but regardless, we should possibly leave the sidebars. We need to do
    // that because it isn't guaranteed that the editor rejoined them.
    if (threadInfo.timestamps.members[editorID]?.isMember > time) {
      return {
        rawMessageInfos,
        updateInfos,
        blobOps: [],
        notificationsCreationData,
      };
    }

    const updatedThreadInfo = {
      ...threadInfo,
      members: threadInfo.members.filter(member => member.id !== editorID),
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

    return {
      rawMessageInfos,
      updateInfos,
      blobOps: [],
      notificationsCreationData,
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
  operationValidator: dmLeaveThreadOperationValidator,
});

export { leaveThreadSpec };
