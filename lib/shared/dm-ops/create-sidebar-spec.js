// @flow

import uuid from 'uuid';

import { createThickRawThreadInfo } from './create-thread-spec.js';
import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMCreateSidebarOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import {
  type RawMessageInfo,
  messageTruncationStatus,
} from '../../types/message-types.js';
import { threadTypes } from '../../types/thread-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import { generatePendingThreadColor } from '../color-utils.js';
import {
  isInvalidSidebarSource,
  rawMessageInfoFromMessageData,
} from '../message-utils.js';

async function createMessageDatasFromDMOperation(
  dmOperation: DMCreateSidebarOperation,
  utilities: ProcessDMOperationUtilities,
  threadColor?: string,
) {
  const {
    threadID,
    creatorID,
    time,
    parentThreadID,
    memberIDs,
    sourceMessageID,
  } = dmOperation;

  const allMemberIDs = [creatorID, ...memberIDs];
  const color = threadColor ?? generatePendingThreadColor(allMemberIDs);
  const sourceMessage = await utilities.fetchMessage(sourceMessageID);

  if (!sourceMessage) {
    throw new Error(
      `could not find sourceMessage ${sourceMessageID}... probably ` +
        'joined thick thread ${parentThreadID} after its creation',
    );
  }
  if (isInvalidSidebarSource(sourceMessage)) {
    throw new Error(
      `sourceMessage ${sourceMessageID} is an invalid sidebar source`,
    );
  }

  const sidebarSourceMessageData = {
    type: messageTypes.SIDEBAR_SOURCE,
    threadID,
    creatorID,
    time,
    sourceMessage: sourceMessage,
  };

  const createSidebarMessageData = {
    type: messageTypes.CREATE_SIDEBAR,
    threadID,
    creatorID,
    time: time + 1,
    sourceMessageAuthorID: sourceMessage.creatorID,
    initialThreadState: {
      parentThreadID,
      color,
      memberIDs: allMemberIDs,
    },
  };

  return {
    sidebarSourceMessageData,
    createSidebarMessageData,
  };
}

const createSidebarSpec: DMOperationSpec<DMCreateSidebarOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMCreateSidebarOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { sidebarSourceMessageData, createSidebarMessageData } =
        await createMessageDatasFromDMOperation(dmOperation, utilities);
      return {
        messageDatas: [sidebarSourceMessageData, createSidebarMessageData],
      };
    },
    processDMOperation: async (
      dmOperation: DMCreateSidebarOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const {
        threadID,
        creatorID,
        time,
        parentThreadID,
        memberIDs,
        sourceMessageID,
        roleID,
        newSidebarSourceMessageID,
        newCreateSidebarMessageID,
      } = dmOperation;
      const allMemberIDs = [creatorID, ...memberIDs];

      const rawThreadInfo = createThickRawThreadInfo(
        {
          threadID,
          threadType: threadTypes.THICK_SIDEBAR,
          creationTime: time,
          parentThreadID,
          allMemberIDs,
          roleID,
          unread: creatorID !== viewerID,
          sourceMessageID,
          containingThreadID: parentThreadID,
        },
        viewerID,
      );

      const { sidebarSourceMessageData, createSidebarMessageData } =
        await createMessageDatasFromDMOperation(
          dmOperation,
          utilities,
          rawThreadInfo.color,
        );

      const sidebarSourceMessageInfo = rawMessageInfoFromMessageData(
        sidebarSourceMessageData,
        newSidebarSourceMessageID,
      );
      const createSidebarMessageInfo = rawMessageInfoFromMessageData(
        createSidebarMessageData,
        newCreateSidebarMessageID,
      );

      const rawMessageInfos: Array<RawMessageInfo> = [
        sidebarSourceMessageInfo,
        createSidebarMessageInfo,
      ];

      const threadJoinUpdateInfo = {
        type: updateTypes.JOIN_THREAD,
        id: uuid.v4(),
        time,
        threadInfo: rawThreadInfo,
        rawMessageInfos,
        truncationStatus: messageTruncationStatus.EXHAUSTIVE,
        rawEntryInfos: [],
      };

      return {
        rawMessageInfos: [], // included in updateInfos below
        updateInfos: [threadJoinUpdateInfo],
      };
    },
    canBeProcessed() {
      return { isProcessingPossible: true };
    },
    supportsAutoRetry: true,
  });

export { createSidebarSpec };
