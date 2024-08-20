// @flow

import uuid from 'uuid';

import { createThickRawThreadInfo } from './create-thread-spec.js';
import type { DMOperationSpec } from './dm-op-spec.js';
import type { DMAddViewerToThreadMembersOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import {
  messageTruncationStatus,
  type RawMessageInfo,
} from '../../types/message-types.js';
import type { AddMembersMessageData } from '../../types/messages/add-members.js';
import { type ThickRawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createAddViewerToThreadMembersMessageDataFromDMOp(
  dmOperation: DMAddViewerToThreadMembersOperation,
): $ReadOnlyArray<AddMembersMessageData> {
  const { editorID, time, addedUserIDs, existingThreadDetails } = dmOperation;
  return [
    {
      type: messageTypes.ADD_MEMBERS,
      threadID: existingThreadDetails.threadID,
      creatorID: editorID,
      time,
      addedUserIDs: [...addedUserIDs],
    },
  ];
}

function createAddViewerToThreadMembersResults(
  dmOperation: DMAddViewerToThreadMembersOperation,
  viewerID: string,
): {
  +rawMessageInfos: Array<RawMessageInfo>,
  +updateInfos: Array<ClientUpdateInfo>,
  +threadInfo: ?ThickRawThreadInfo,
} {
  const { time, messageID, addedUserIDs, existingThreadDetails } = dmOperation;
  const messageDatas =
    createAddViewerToThreadMembersMessageDataFromDMOp(dmOperation);

  const rawMessageInfos = messageDatas.map(messageData =>
    rawMessageInfoFromMessageData(messageData, messageID),
  );

  const resultThreadInfo = createThickRawThreadInfo(
    {
      ...existingThreadDetails,
      allMemberIDs: [...existingThreadDetails.allMemberIDs, ...addedUserIDs],
    },
    viewerID,
  );
  const updateInfos = [
    {
      type: updateTypes.JOIN_THREAD,
      id: uuid.v4(),
      time,
      threadInfo: resultThreadInfo,
      rawMessageInfos,
      truncationStatus: messageTruncationStatus.EXHAUSTIVE,
      rawEntryInfos: [],
    },
  ];
  return {
    rawMessageInfos: [],
    updateInfos,
    threadInfo: resultThreadInfo,
  };
}

const addViewerToThreadMembersSpec: DMOperationSpec<DMAddViewerToThreadMembersOperation> =
  Object.freeze({
    messageDataFromDMOperation: async (
      dmOperation: DMAddViewerToThreadMembersOperation,
    ) => {
      return createAddViewerToThreadMembersMessageDataFromDMOp(dmOperation);
    },
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
      // The operation is invalid when this condition is false
      if (dmOperation.addedUserIDs.includes(viewerID)) {
        return { isProcessingPossible: true };
      }
      return {
        isProcessingPossible: false,
        reason: {
          type: 'missing_thread',
          threadID: dmOperation.existingThreadDetails.threadID,
        },
      };
    },
  });

export {
  addViewerToThreadMembersSpec,
  createAddViewerToThreadMembersResults,
  createAddViewerToThreadMembersMessageDataFromDMOp,
};
