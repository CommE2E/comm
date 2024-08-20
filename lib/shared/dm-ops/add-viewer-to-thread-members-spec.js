// @flow

import uuid from 'uuid';

import type { AddMembersResult } from './add-members-spec.js';
import { createThickRawThreadInfo } from './create-thread-spec.js';
import type { DMOperationSpec } from './dm-op-spec.js';
import type { DMAddViewerToThreadMembersOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { messageTruncationStatus } from '../../types/message-types.js';
import type { AddMembersMessageData } from '../../types/messages/add-members.js';
import { updateTypes } from '../../types/update-types-enum.js';
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
): AddMembersResult {
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
    notificationsCreationData: async (
      dmOperation: DMAddViewerToThreadMembersOperation,
    ) => {
      const messageDatas =
        createAddViewerToThreadMembersMessageDataFromDMOp(dmOperation);
      return { messageDatas };
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
    supportsAutoRetry: true,
  });

export {
  addViewerToThreadMembersSpec,
  createAddViewerToThreadMembersResults,
  createAddViewerToThreadMembersMessageDataFromDMOp,
};
