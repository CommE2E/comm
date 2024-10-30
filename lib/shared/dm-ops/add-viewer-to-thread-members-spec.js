// @flow

import uuid from 'uuid';

import { createPermissionsForNewMembers } from './add-members-spec.js';
import { createThickRawThreadInfo } from './create-thread-spec.js';
import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import {
  type DMAddViewerToThreadMembersOperation,
  dmAddViewerToThreadMembersValidator,
} from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type { RawMessageInfo } from '../../types/message-types.js';
import { messageTruncationStatus } from '../../types/message-types.js';
import type { AddMembersMessageData } from '../../types/messages/add-members.js';
import {
  minimallyEncodeMemberInfo,
  minimallyEncodeThreadCurrentUserInfo,
} from '../../types/minimally-encoded-thread-permissions-types.js';
import { joinThreadSubscription } from '../../types/subscription-types.js';
import type { ThickMemberInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';
import { userIsMember } from '../thread-utils.js';

function createAddViewerToThreadMembersMessageDataWithInfoFromDMOp(
  dmOperation: DMAddViewerToThreadMembersOperation,
): {
  +messageData: AddMembersMessageData,
  +rawMessageInfo: RawMessageInfo,
} {
  const { editorID, time, addedUserIDs, existingThreadDetails, messageID } =
    dmOperation;
  const messageData = {
    type: messageTypes.ADD_MEMBERS,
    threadID: existingThreadDetails.threadID,
    creatorID: editorID,
    time,
    addedUserIDs: [...addedUserIDs],
  };
  const rawMessageInfo = rawMessageInfoFromMessageData(messageData, messageID);
  return { messageData, rawMessageInfo };
}

const addViewerToThreadMembersSpec: DMOperationSpec<DMAddViewerToThreadMembersOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMAddViewerToThreadMembersOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { time, messageID, addedUserIDs, existingThreadDetails, editorID } =
        dmOperation;
      const { threadInfos } = utilities;

      const messageDataWithMessageInfos =
        createAddViewerToThreadMembersMessageDataWithInfoFromDMOp(dmOperation);
      const { rawMessageInfo } = messageDataWithMessageInfos;
      const rawMessageInfos = messageID ? [rawMessageInfo] : [];

      const threadID = existingThreadDetails.threadID;
      const currentThreadInfo = threadInfos[threadID];

      const memberTimestamps = {
        ...currentThreadInfo?.timestamps?.members,
      };
      const newMembers = [];
      for (const userID of addedUserIDs) {
        if (!memberTimestamps[userID]) {
          memberTimestamps[userID] = {
            isMember: time,
            subscription: existingThreadDetails.creationTime,
          };
        }

        if (memberTimestamps[userID].isMember > time) {
          continue;
        }

        memberTimestamps[userID] = {
          ...memberTimestamps[userID],
          isMember: time,
        };

        if (!userIsMember(currentThreadInfo, userID)) {
          newMembers.push(userID);
        }
      }

      if (currentThreadInfo) {
        const { membershipPermissions, roleID } =
          createPermissionsForNewMembers(currentThreadInfo, utilities);

        const newMemberInfos = newMembers.map(userID =>
          minimallyEncodeMemberInfo<ThickMemberInfo>({
            id: userID,
            role: roleID,
            permissions: membershipPermissions,
            isSender: editorID === utilities.viewerID,
            subscription: joinThreadSubscription,
          }),
        );

        const resultThreadInfo = {
          ...currentThreadInfo,
          members: [...currentThreadInfo.members, ...newMemberInfos],
          currentUser: minimallyEncodeThreadCurrentUserInfo({
            role: roleID,
            permissions: membershipPermissions,
            subscription: joinThreadSubscription,
            unread: true,
          }),
          timestamps: {
            ...currentThreadInfo.timestamps,
            members: {
              ...currentThreadInfo.timestamps.members,
              ...memberTimestamps,
            },
          },
        };

        const updateInfos = [
          {
            type: updateTypes.UPDATE_THREAD,
            id: uuid.v4(),
            time,
            threadInfo: resultThreadInfo,
          },
        ];

        const notificationsCreationData = {
          messageDatasWithMessageInfos: [messageDataWithMessageInfos],
          thickRawThreadInfos: {
            [threadID]: resultThreadInfo,
          },
        };

        return {
          rawMessageInfos,
          updateInfos,
          blobOps: [],
          notificationsCreationData,
        };
      }

      const resultThreadInfo = createThickRawThreadInfo(
        {
          ...existingThreadDetails,
          allMemberIDsWithSubscriptions: [
            ...existingThreadDetails.allMemberIDsWithSubscriptions,
            ...newMembers.map(id => ({
              id,
              subscription: joinThreadSubscription,
            })),
          ],
          timestamps: {
            ...existingThreadDetails.timestamps,
            members: {
              ...existingThreadDetails.timestamps.members,
              ...memberTimestamps,
            },
          },
        },
        utilities,
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
      const notificationsCreationData = {
        messageDatasWithMessageInfos: [messageDataWithMessageInfos],
        thickRawThreadInfos: {
          [threadID]: resultThreadInfo,
        },
      };
      return {
        rawMessageInfos: [],
        updateInfos,
        blobOps: [],
        notificationsCreationData,
      };
    },
    canBeProcessed: async (
      dmOperation: DMAddViewerToThreadMembersOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { viewerID } = utilities;
      // We expect the viewer to be in the added users when the DM op
      // is processed. An exception is for ops generated
      // by InitialStateSharingHandler, which won't contain a messageID
      if (
        dmOperation.addedUserIDs.includes(viewerID) ||
        !dmOperation.messageID
      ) {
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
    operationValidator: dmAddViewerToThreadMembersValidator,
  });

export {
  addViewerToThreadMembersSpec,
  createAddViewerToThreadMembersMessageDataWithInfoFromDMOp,
};
