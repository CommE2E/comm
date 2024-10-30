// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import {
  type DMUpdateRelationshipOperation,
  dmUpdateRelationshipOperationValidator,
} from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

async function createMessageDataWithInfoFromDMOperation(
  dmOperation: DMUpdateRelationshipOperation,
  utilities: ProcessDMOperationUtilities,
) {
  const { threadID, creatorID, time, operation, messageID, targetUserID } =
    dmOperation;
  const { findUserIdentities } = utilities;
  if (operation !== 'farcaster_mutual') {
    const messageData = {
      type: messageTypes.UPDATE_RELATIONSHIP,
      threadID,
      creatorID,
      targetID: targetUserID,
      time,
      operation,
    };
    const rawMessageInfo = rawMessageInfoFromMessageData(
      messageData,
      messageID,
    );
    return { rawMessageInfo, messageData };
  }
  const { identities: userIdentities } = await findUserIdentities([
    creatorID,
    targetUserID,
  ]);
  const creatorFID = userIdentities[creatorID]?.farcasterID;
  const targetFID = userIdentities[targetUserID]?.farcasterID;
  if (!creatorFID || !targetFID) {
    const errorMap = { [creatorID]: creatorFID, [targetUserID]: targetFID };
    throw new Error(
      'could not fetch FID for either creator or target: ' +
        JSON.stringify(errorMap),
    );
  }
  const messageData = {
    type: messageTypes.UPDATE_RELATIONSHIP,
    threadID,
    creatorID,
    creatorFID,
    targetID: targetUserID,
    targetFID,
    time,
    operation,
  };
  const rawMessageInfo = rawMessageInfoFromMessageData(messageData, messageID);
  return { rawMessageInfo, messageData };
}

const updateRelationshipSpec: DMOperationSpec<DMUpdateRelationshipOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMUpdateRelationshipOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const messageDataWithMessageInfos =
        await createMessageDataWithInfoFromDMOperation(dmOperation, utilities);
      const { rawMessageInfo } = messageDataWithMessageInfos;
      const rawMessageInfos = [rawMessageInfo];

      const notificationsCreationData = {
        messageDatasWithMessageInfos: [messageDataWithMessageInfos],
        thickRawThreadInfos: {
          [dmOperation.threadID]: utilities.threadInfos[dmOperation.threadID],
        },
      };

      return {
        rawMessageInfos,
        updateInfos: [],
        blobOps: [],
        notificationsCreationData,
      };
    },
    canBeProcessed: async (
      dmOperation: DMUpdateRelationshipOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      try {
        await createMessageDataWithInfoFromDMOperation(dmOperation, utilities);
        return {
          isProcessingPossible: true,
        };
      } catch (e) {
        return {
          isProcessingPossible: false,
          reason: { type: 'invalid' },
        };
      }
    },
    supportsAutoRetry: true,
    operationValidator: dmUpdateRelationshipOperationValidator,
  });

export { updateRelationshipSpec };
