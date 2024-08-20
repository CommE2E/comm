// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import {
  type AddMembersResult,
  createAddNewMembersResults,
  createAddNewMembersMessageDatasFromDMOperation,
} from './add-members-spec.js';
import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type {
  DMChangeThreadSettingsAndAddViewerOperation,
  DMChangeThreadSettingsOperation,
  DMOperationResult,
} from '../../types/dm-ops.js';
import type { MessageData, RawMessageInfo } from '../../types/message-types';
import { messageTypes } from '../../types/message-types-enum.js';
import type { ChangeSettingsMessageData } from '../../types/messages/change-settings.js';
import type { RawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { LegacyRawThreadInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
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

function processThreadSettingsChanges(
  dmOperation:
    | DMChangeThreadSettingsOperation
    | DMChangeThreadSettingsAndAddViewerOperation,
): $ReadOnlyArray<ChangeSettingsMessageData> {
  const { changes, editorID, time } = dmOperation;
  const { name, description, color, avatar } = changes;
  const threadID = getThreadIDFromChangeThreadSettingsDMOp(dmOperation);

  const changedFields: {
    [string]: string | number,
  } = {};

  if (name !== undefined && name !== null) {
    changedFields.name = name;
  }

  if (description !== undefined && description !== null) {
    changedFields.description = description;
  }

  if (color) {
    changedFields.color = color;
  }

  if (avatar) {
    changedFields.avatar = JSON.stringify(avatar);
  }

  const messageDatas: Array<ChangeSettingsMessageData> = [];
  for (const fieldName of Object.keys(changedFields)) {
    const newValue = changedFields[fieldName];
    messageDatas.push({
      type: messageTypes.CHANGE_SETTINGS,
      threadID,
      creatorID: editorID,
      time,
      field: fieldName,
      value: newValue,
    });
  }

  return messageDatas;
}

function processChangeSettingsOperation(
  dmOperation:
    | DMChangeThreadSettingsOperation
    | DMChangeThreadSettingsAndAddViewerOperation,
  viewerID: string,
  utilities: ProcessDMOperationUtilities,
  addMembersResult: ?AddMembersResult,
): DMOperationResult {
  const { time, changes, messageIDsPrefix } = dmOperation;
  const { name, description, color, avatar } = changes;
  const threadID = getThreadIDFromChangeThreadSettingsDMOp(dmOperation);

  let threadInfoToUpdate: ?(RawThreadInfo | LegacyRawThreadInfo) =
    utilities.threadInfos[threadID];
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
  const messageDatas = processThreadSettingsChanges(dmOperation);

  if (name !== undefined && name !== null) {
    threadInfoToUpdate = {
      ...threadInfoToUpdate,
      name,
    };
  }

  if (description !== undefined && description !== null) {
    threadInfoToUpdate = {
      ...threadInfoToUpdate,
      description,
    };
  }

  if (color) {
    threadInfoToUpdate = {
      ...threadInfoToUpdate,
      color,
    };
  }

  if (avatar) {
    threadInfoToUpdate = {
      ...threadInfoToUpdate,
      avatar,
    };
  }

  rawMessageInfos.push(
    ...messageDatas.map(messageData =>
      rawMessageInfoFromMessageData(
        messageData,
        `${messageIDsPrefix}/${messageData.field}`,
      ),
    ),
  );

  if (messageDatas.length > 0) {
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
          createAddNewMembersMessageDatasFromDMOperation(
            addNewMembersOperation,
          );
        messageDatas.push(...addNewMembersMessageData);
      }

      const changeSettingsMessageData =
        processThreadSettingsChanges(dmOperation);
      messageDatas.push(...changeSettingsMessageData);
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
  });

export {
  changeThreadSettingsSpec,
  processChangeSettingsOperation,
  processThreadSettingsChanges,
};
