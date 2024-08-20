// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import {
  type AddMembersResult,
  createAddNewMembersResults,
  createAddNewMembersMessageDataFromDMOperation,
} from './add-members-spec.js';
import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type {
  DMChangeThreadSettingsAndAddViewerOperation,
  DMChangeThreadSettingsOperation,
  DMOperationResult,
  DMThreadSettingsChangesBase,
} from '../../types/dm-ops.js';
import type { MessageData, RawMessageInfo } from '../../types/message-types';
import { messageTypes } from '../../types/message-types-enum.js';
import type { ChangeSettingsMessageData } from '../../types/messages/change-settings.js';
import type { RawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { values } from '../../utils/objects.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function createAddMembersOperation(
  dmOperation: DMChangeThreadSettingsOperation,
) {
  const { editorID, time, messageIDsPrefix, changes, threadID } = dmOperation;
  const newMemberIDs =
    changes.newMemberIDs && changes.newMemberIDs.length > 0
      ? [...new Set(changes.newMemberIDs)]
      : [];
  if (!changes.newMemberIDs || changes.newMemberIDs.length === 0) {
    return null;
  }
  return {
    type: 'add_members',
    editorID,
    time,
    messageID: `${messageIDsPrefix}/add_members`,
    addedUserIDs: newMemberIDs,
    threadID,
  };
}

function processAddMembersOperation(
  dmOperation: DMChangeThreadSettingsOperation,
  viewerID: string,
  utilities: ProcessDMOperationUtilities,
) {
  const operation = createAddMembersOperation(dmOperation);
  if (!operation) {
    return null;
  }
  return createAddNewMembersResults(operation, viewerID, utilities);
}

function getThreadIDFromChangeThreadSettingsDMOp(
  dmOperation:
    | DMChangeThreadSettingsOperation
    | DMChangeThreadSettingsAndAddViewerOperation,
): string {
  return dmOperation.type === 'change_thread_settings'
    ? dmOperation.threadID
    : dmOperation.existingThreadDetails.threadID;
}

function createChangeSettingsMessageDatasAndUpdate(
  dmOperation:
    | DMChangeThreadSettingsOperation
    | DMChangeThreadSettingsAndAddViewerOperation,
): {
  +fieldNameToMessageData: { +[fieldName: string]: ChangeSettingsMessageData },
  +threadInfoUpdate: DMThreadSettingsChangesBase,
} {
  const { changes, editorID, time } = dmOperation;
  const { name, description, color, avatar } = changes;
  const threadID = getThreadIDFromChangeThreadSettingsDMOp(dmOperation);

  const threadInfoUpdate: { ...DMThreadSettingsChangesBase } = {};

  if (name !== undefined && name !== null) {
    threadInfoUpdate.name = name;
  }

  if (description !== undefined && description !== null) {
    threadInfoUpdate.description = description;
  }

  if (color) {
    threadInfoUpdate.color = color;
  }

  if (avatar) {
    threadInfoUpdate.avatar = avatar;
  }

  const fieldNameToMessageData: {
    [fieldName: string]: ChangeSettingsMessageData,
  } = {};

  const { avatar: avatarObject, ...rest } = threadInfoUpdate;
  const normalizedThreadInfoUpdate = avatarObject
    ? { ...rest, avatar: JSON.stringify(avatarObject) }
    : { ...rest };

  for (const fieldName in normalizedThreadInfoUpdate) {
    const value = normalizedThreadInfoUpdate[fieldName];
    fieldNameToMessageData[fieldName] = {
      type: messageTypes.CHANGE_SETTINGS,
      threadID,
      creatorID: editorID,
      time,
      field: fieldName,
      value: value,
    };
  }

  return { fieldNameToMessageData, threadInfoUpdate };
}

function processChangeSettingsOperation(
  dmOperation:
    | DMChangeThreadSettingsOperation
    | DMChangeThreadSettingsAndAddViewerOperation,
  viewerID: string,
  utilities: ProcessDMOperationUtilities,
  addMembersResult: ?AddMembersResult,
): DMOperationResult {
  const { time, messageIDsPrefix } = dmOperation;
  const threadID = getThreadIDFromChangeThreadSettingsDMOp(dmOperation);

  let threadInfoToUpdate: ?RawThreadInfo = utilities.threadInfos[threadID];
  const updateInfos: Array<ClientUpdateInfo> = [];
  const rawMessageInfos: Array<RawMessageInfo> = [];

  if (addMembersResult) {
    if (addMembersResult.threadInfo) {
      threadInfoToUpdate = addMembersResult.threadInfo;
    }
    updateInfos.push(...addMembersResult.updateInfos);
    rawMessageInfos.push(...addMembersResult.rawMessageInfos);
  }

  invariant(threadInfoToUpdate?.thick, 'Thread should be thick');
  const { fieldNameToMessageData, threadInfoUpdate } =
    createChangeSettingsMessageDatasAndUpdate(dmOperation);

  const fieldNameToMessageDataPairs = Object.entries(fieldNameToMessageData);
  rawMessageInfos.push(
    ...fieldNameToMessageDataPairs.map(([fieldName, messageData]) =>
      rawMessageInfoFromMessageData(
        messageData,
        `${messageIDsPrefix}/${fieldName}`,
      ),
    ),
  );

  threadInfoToUpdate = {
    ...threadInfoToUpdate,
    ...threadInfoUpdate,
  };

  if (fieldNameToMessageDataPairs.length > 0) {
    updateInfos.push({
      type: updateTypes.UPDATE_THREAD,
      id: uuid.v4(),
      time,
      threadInfo: threadInfoToUpdate,
    });
  }

  return {
    rawMessageInfos,
    updateInfos,
  };
}

const changeThreadSettingsSpec: DMOperationSpec<DMChangeThreadSettingsOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMChangeThreadSettingsOperation,
    ) => {
      const messageDatas: Array<MessageData> = [];
      const addNewMembersOperation = createAddMembersOperation(dmOperation);
      if (addNewMembersOperation) {
        const addNewMembersMessageData =
          createAddNewMembersMessageDataFromDMOperation(addNewMembersOperation);
        messageDatas.push(addNewMembersMessageData);
      }

      const { fieldNameToMessageData } =
        createChangeSettingsMessageDatasAndUpdate(dmOperation);
      messageDatas.push(...values(fieldNameToMessageData));
      return { messageDatas };
    },
    processDMOperation: async (
      dmOperation: DMChangeThreadSettingsOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const addMembersResult = processAddMembersOperation(
        dmOperation,
        viewerID,
        utilities,
      );

      return processChangeSettingsOperation(
        dmOperation,
        viewerID,
        utilities,
        addMembersResult,
      );
    },
    canBeProcessed(
      dmOperation: DMChangeThreadSettingsOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) {
      if (utilities.threadInfos[dmOperation.threadID]) {
        return { isProcessingPossible: true };
      }
      return {
        isProcessingPossible: false,
        reason: {
          type: 'missing_thread',
          threadID: dmOperation.threadID,
        },
      };
    },
    supportsAutoRetry: true,
  });

export {
  changeThreadSettingsSpec,
  processChangeSettingsOperation,
  createChangeSettingsMessageDatasAndUpdate,
};
