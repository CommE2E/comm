// @flow

import uuid from 'uuid';

import { createThickRawThreadInfo } from './create-thread-spec.js';
import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import {
  type DMCreateSidebarOperation,
  dmCreateSidebarOperationValidator,
} from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import {
  type RawMessageInfo,
  type ValidRawSidebarSourceMessageInfo,
  messageTruncationStatus,
} from '../../types/message-types.js';
import { joinThreadSubscription } from '../../types/subscription-types.js';
import { threadTypes } from '../../types/thread-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import { generatePendingThreadColor } from '../color-utils.js';
import {
  isValidRawSidebarSourceMessageInfo,
  rawMessageInfoFromMessageData,
} from '../message-utils.js';
import { createSidebarThreadName } from '../sidebar-utils.js';
import { createThreadTimestamps } from '../thread-utils.js';

function getSimpleTitleFromRawMessage(
  sourceMessage: ValidRawSidebarSourceMessageInfo,
): string {
  if (sourceMessage.type === messageTypes.TEXT) {
    return sourceMessage.text;
  }
  // For other message types, return a generic title
  // This matches the behavior when markdown rules aren't available
  return 'message';
}

function createMessageDatasWithInfosFromDMOperation(
  dmOperation: DMCreateSidebarOperation,
  utilities: ProcessDMOperationUtilities,
  sourceMessage: ValidRawSidebarSourceMessageInfo,
  threadColor?: string,
) {
  const {
    threadID,
    creatorID,
    time,
    parentThreadID,
    memberIDs,
    newSidebarSourceMessageID,
    newCreateSidebarMessageID,
  } = dmOperation;

  const allMemberIDs = [creatorID, ...memberIDs];
  const color = threadColor ?? generatePendingThreadColor(allMemberIDs);

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
  const sidebarSourceMessageInfo = rawMessageInfoFromMessageData(
    sidebarSourceMessageData,
    newSidebarSourceMessageID,
  );
  const createSidebarMessageInfo = rawMessageInfoFromMessageData(
    createSidebarMessageData,
    newCreateSidebarMessageID,
  );

  return {
    sidebarSourceMessageData,
    createSidebarMessageData,
    sidebarSourceMessageInfo,
    createSidebarMessageInfo,
  };
}

const createSidebarSpec: DMOperationSpec<DMCreateSidebarOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMCreateSidebarOperation,
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
      } = dmOperation;
      const { viewerID } = utilities;
      const allMemberIDs = [creatorID, ...memberIDs];
      const allMemberIDsWithSubscriptions = allMemberIDs.map(id => ({
        id,
        subscription: joinThreadSubscription,
      }));

      const sourceMessage = await utilities.fetchMessage(sourceMessageID);
      if (!sourceMessage) {
        throw new Error(
          `could not find sourceMessage ${sourceMessageID}... probably ` +
            'joined thick thread ${parentThreadID} after its creation',
        );
      }
      if (!isValidRawSidebarSourceMessageInfo(sourceMessage)) {
        throw new Error(
          `sourceMessage ${sourceMessageID} is an invalid sidebar source`,
        );
      }

      const messageTitle = getSimpleTitleFromRawMessage(sourceMessage);
      const threadName = createSidebarThreadName(messageTitle);

      const rawThreadInfo = createThickRawThreadInfo(
        {
          threadID,
          threadType: threadTypes.THICK_SIDEBAR,
          creationTime: time,
          parentThreadID,
          allMemberIDsWithSubscriptions,
          roleID,
          unread: creatorID !== viewerID,
          name: threadName,
          sourceMessageID,
          containingThreadID: parentThreadID,
          timestamps: createThreadTimestamps(time, allMemberIDs),
        },
        utilities,
      );

      const {
        sidebarSourceMessageData,
        createSidebarMessageData,
        createSidebarMessageInfo,
        sidebarSourceMessageInfo,
      } = createMessageDatasWithInfosFromDMOperation(
        dmOperation,
        utilities,
        sourceMessage,
        rawThreadInfo.color,
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

      const notificationsCreationData = {
        messageDatasWithMessageInfos: [
          {
            messageData: sidebarSourceMessageData,
            rawMessageInfo: sidebarSourceMessageInfo,
          },
          {
            messageData: createSidebarMessageData,
            rawMessageInfo: createSidebarMessageInfo,
          },
        ],
        thickRawThreadInfos: {
          [threadID]: rawThreadInfo,
          [parentThreadID]: utilities.threadInfos[parentThreadID],
        },
      };

      return {
        rawMessageInfos: [], // included in updateInfos below
        updateInfos: [threadJoinUpdateInfo],
        blobOps: [],
        notificationsCreationData,
      };
    },
    canBeProcessed: async (
      dmOperation: DMCreateSidebarOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      if (utilities.threadInfos[dmOperation.threadID]) {
        console.log(
          'Discarded a CREATE_SIDEBAR operation because thread ' +
            `with the same ID ${dmOperation.threadID} already exists ` +
            'in the store',
        );
        return {
          isProcessingPossible: false,
          reason: {
            type: 'invalid',
          },
        };
      }

      const sourceMessage = await utilities.fetchMessage(
        dmOperation.sourceMessageID,
      );

      if (!sourceMessage) {
        return {
          isProcessingPossible: false,
          reason: {
            type: 'missing_message',
            messageID: dmOperation.sourceMessageID,
          },
        };
      }
      return { isProcessingPossible: true };
    },
    supportsAutoRetry: true,
    operationValidator: dmCreateSidebarOperationValidator,
  });

export { createSidebarSpec };
