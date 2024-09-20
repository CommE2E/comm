// @flow

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMUpdateRelationshipOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

async function createMessageDataFromDMOperation(
  dmOperation: DMUpdateRelationshipOperation,
  utilities: ProcessDMOperationUtilities,
) {
  const { threadID, creatorID, time, operation } = dmOperation;
  const { viewerID, findUserIdentities } = utilities;
  if (operation !== 'farcaster_mutual') {
    return {
      type: messageTypes.UPDATE_RELATIONSHIP,
      threadID,
      creatorID,
      targetID: viewerID,
      time,
      operation,
    };
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
  return {
    type: messageTypes.UPDATE_RELATIONSHIP,
    threadID,
    creatorID,
    creatorFID,
    targetID: viewerID,
    targetFID,
    time,
    operation,
  };
}

const updateRelationshipSpec: DMOperationSpec<DMUpdateRelationshipOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMUpdateRelationshipOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const messageData = await createMessageDataFromDMOperation(
        dmOperation,
        utilities,
      );
      return { messageDatas: [messageData] };
    },
    processDMOperation: async (
      dmOperation: DMUpdateRelationshipOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { messageID } = dmOperation;
      const messageData = await createMessageDataFromDMOperation(
        dmOperation,
        utilities,
      );
      const rawMessageInfos = [
        rawMessageInfoFromMessageData(messageData, messageID),
      ];
      return {
        rawMessageInfos,
        updateInfos: [],
      };
    },
    canBeProcessed: async (
      dmOperation: DMUpdateRelationshipOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      try {
        await createMessageDataFromDMOperation(dmOperation, utilities);
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
