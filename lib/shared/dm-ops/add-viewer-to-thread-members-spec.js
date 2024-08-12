// @flow

import uuid from 'uuid';

import type { AddMembersResult } from './add-members-spec.js';
import { createThickRawThreadInfo } from './create-thread-spec.js';
import type { DMOperationSpec } from './dm-op-spec.js';
import { createRepliesCountUpdate } from './dm-op-utils.js';
import type { DMAddViewerToThreadMembersOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { messageTruncationStatus } from '../../types/message-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';

function createAddViewerToThreadMembersResults(
  dmOperation: DMAddViewerToThreadMembersOperation,
  viewerID: string,
): AddMembersResult {
  const { editorID, time, messageID, addedUserIDs, existingThreadDetails } =
    dmOperation;
  const addMembersMessage = {
    type: messageTypes.ADD_MEMBERS,
    id: messageID,
    threadID: existingThreadDetails.threadID,
    creatorID: editorID,
    time,
    addedUserIDs: [...addedUserIDs],
  };

  const updateInfos: Array<ClientUpdateInfo> = [];

  const resultThreadInfo = createThickRawThreadInfo(
    {
      ...existingThreadDetails,
      allMemberIDs: [...existingThreadDetails.allMemberIDs, ...addedUserIDs],
    },
    viewerID,
  );
  updateInfos.push({
    type: updateTypes.JOIN_THREAD,
    id: uuid.v4(),
    time,
    threadInfo: resultThreadInfo,
    rawMessageInfos: [addMembersMessage],
    truncationStatus: messageTruncationStatus.EXHAUSTIVE,
    rawEntryInfos: [],
  });
  const repliesCountUpdate = createRepliesCountUpdate(resultThreadInfo, [
    addMembersMessage,
  ]);
  if (
    repliesCountUpdate &&
    repliesCountUpdate.type === updateTypes.UPDATE_THREAD
  ) {
    updateInfos.push(repliesCountUpdate);
    resultThreadInfo.repliesCount = repliesCountUpdate.threadInfo.repliesCount;
  }
  return {
    rawMessageInfos: [],
    updateInfos,
    threadInfo: resultThreadInfo,
  };
}

const addViewerToThreadMembersSpec: DMOperationSpec<DMAddViewerToThreadMembersOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMAddViewerToThreadMembersOperation,
      viewerID: string,
    ) => {
      const { rawMessageInfos, updateInfos } =
        createAddViewerToThreadMembersResults(dmOperation, viewerID);
      return { rawMessageInfos, updateInfos };
    },
    canBeProcessed(
      dmOperation: DMAddViewerToThreadMembersOperation,
      viewerID: string,
    ) {
      if (dmOperation.addedUserIDs.includes(viewerID)) {
        return { isProcessingPossible: true };
      }
      console.log('Invalid DM operation', dmOperation);
      return {
        isProcessingPossible: false,
        reason: {
          type: 'invalid',
        },
      };
    },
  });

export { addViewerToThreadMembersSpec, createAddViewerToThreadMembersResults };
