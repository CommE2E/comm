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
import { isInvalidSidebarSource } from '../message-utils.js';

const createSidebarSpec: DMOperationSpec<DMCreateSidebarOperation> =
  Object.freeze({
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
          creatorID,
          sourceMessageID,
          containingThreadID: parentThreadID,
        },
        viewerID,
      );

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

      const rawMessageInfos: Array<RawMessageInfo> = [
        {
          type: messageTypes.SIDEBAR_SOURCE,
          id: newSidebarSourceMessageID,
          threadID,
          creatorID,
          time,
          sourceMessage,
        },
        {
          type: messageTypes.CREATE_SIDEBAR,
          id: newCreateSidebarMessageID,
          threadID,
          creatorID,
          time: time + 1,
          sourceMessageAuthorID: sourceMessage.creatorID,
          initialThreadState: {
            parentThreadID,
            color: rawThreadInfo.color,
            memberIDs: allMemberIDs,
          },
        },
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
  });

export { createSidebarSpec };
