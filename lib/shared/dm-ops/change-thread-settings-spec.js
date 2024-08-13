// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import {
  type AddMembersResult,
  createAddNewMembersResults,
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
import { messageTypes } from '../../types/message-types-enum.js';
import type { RawMessageInfo } from '../../types/message-types.js';
import type { RawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { LegacyRawThreadInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { values } from '../../utils/objects.js';

function processAddMembersOperation(
  dmOperation: DMChangeThreadSettingsOperation,
  viewerID: string,
  utilities: ProcessDMOperationUtilities,
) {
  const { editorID, time, messageIDsPrefix, changes, threadID } = dmOperation;
  const newMemberIDs =
    changes.newMemberIDs && changes.newMemberIDs.length > 0
      ? [...new Set(changes.newMemberIDs)]
      : [];
  if (!changes.newMemberIDs || changes.newMemberIDs.length === 0) {
    return null;
  }
  const operation = {
    type: 'add_members',
    editorID,
    time,
    messageID: `${messageIDsPrefix}/add_members`,
    addedUserIDs: newMemberIDs,
    threadID,
  };
  return createAddNewMembersResults(operation, viewerID, utilities);
}

function processChangeSettingsOperation(
  dmOperation:
    | DMChangeThreadSettingsOperation
    | DMChangeThreadSettingsAndAddViewerOperation,
  viewerID: string,
  utilities: ProcessDMOperationUtilities,
  addMembersResult: ?AddMembersResult,
): DMOperationResult {
  const { editorID, time, changes, messageIDsPrefix } = dmOperation;
  const { name, description, color, avatar } = changes;
  const threadID =
    dmOperation.type === 'change_thread_settings'
      ? dmOperation.threadID
      : dmOperation.existingThreadDetails.threadID;

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

  const changedFields: { [string]: string | number } = {};

  if (name !== undefined && name !== null) {
    changedFields.name = name;
    threadInfoToUpdate = {
      ...threadInfoToUpdate,
      name,
    };
  }

  if (description !== undefined && description !== null) {
    changedFields.description = description;
    threadInfoToUpdate = {
      ...threadInfoToUpdate,
      description,
    };
  }

  if (color) {
    changedFields.color = color;
    threadInfoToUpdate = {
      ...threadInfoToUpdate,
      color,
    };
  }

  if (avatar) {
    changedFields.avatar = JSON.stringify(avatar);
    threadInfoToUpdate = {
      ...threadInfoToUpdate,
      avatar,
    };
  }

  for (const fieldName in changedFields) {
    const newValue = changedFields[fieldName];
    rawMessageInfos.push({
      type: messageTypes.CHANGE_SETTINGS,
      threadID,
      creatorID: editorID,
      time,
      field: fieldName,
      value: newValue,
      id: `${messageIDsPrefix}/${fieldName}`,
    });
  }

  if (values(changedFields).length > 0) {
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

export { changeThreadSettingsSpec, processChangeSettingsOperation };
