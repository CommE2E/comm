// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMUpdateRelationshipOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

async function createMessageDataWithInfoFromDMOperation(
  dmOperation: DMUpdateRelationshipOperation,
  utilities: ProcessDMOperationUtilities,
) {
  const { threadID, creatorID, time, operation, messageID } = dmOperation;
  const { viewerID, findUserIdentities } = utilities;
  if (operation !== 'farcaster_mutual') {
    const messageData = {
      type: messageTypes.UPDATE_RELATIONSHIP,
      threadID,
      creatorID,
      targetID: viewerID,
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
    viewerID,
  ]);
  const creatorFID = userIdentities[creatorID]?.farcasterID;
  const targetFID = userIdentities[viewerID]?.farcasterID;
  if (!creatorFID || !targetFID) {
    const errorMap = { creatorID: creatorFID, viewerID: targetFID };
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
    targetID: viewerID,
    targetFID,
    time,
    operation,
  };
  const rawMessageInfo = rawMessageInfoFromMessageData(messageData, messageID);
  return { rawMessageInfo, messageData };
}

const updateRelationshipSpec: DMOperationSpec<DMUpdateRelationshipOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMUpdateRelationshipOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const messageDataWithMessageInfo =
        await createMessageDataWithInfoFromDMOperation(
          dmOperation,

          utilities,
        );
      return {
        messageDatasWithMessageInfos: [messageDataWithMessageInfo],
      };
    },
    processDMOperation: async (
      dmOperation: DMUpdateRelationshipOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { rawMessageInfo } = await createMessageDataWithInfoFromDMOperation(
        dmOperation,
        utilities,
      );
      const rawMessageInfos = [rawMessageInfo];
      return {
        rawMessageInfos,
        updateInfos: [],
        blobOps: [],
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
  });

export { updateRelationshipSpec };
