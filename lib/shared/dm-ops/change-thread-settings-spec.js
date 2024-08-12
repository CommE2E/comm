// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import { createAddNewMembersResults } from './add-members-spec.js';
import {
  addViewerToThreadMembersSpec,
  createAddViewerToThreadMembersResults,
} from './add-viewer-to-thread-members-spec.js';
import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import { createRepliesCountUpdate } from './dm-op-utils.js';
import type { DMChangeThreadSettingsOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type { RawMessageInfo } from '../../types/message-types.js';
import type { RawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { LegacyRawThreadInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { values } from '../../utils/objects.js';

function createAddMembersOperation(
  dmOperation: DMChangeThreadSettingsOperation,
  viewerID: string,
) {
  const { editorID, time, messageIDsPrefix, changes, existingThreadDetails } =
    dmOperation;
  const newMemberIDs =
    changes.newMemberIDs && changes.newMemberIDs.length > 0
      ? [...new Set(changes.newMemberIDs)]
      : [];
  if (newMemberIDs.includes(viewerID)) {
    return {
      type: 'add_viewer_to_thread_members',
      editorID,
      time,
      messageID: `${messageIDsPrefix}/add_members`,
      addedUserIDs: newMemberIDs,
      existingThreadDetails,
    };
  }
  return {
    type: 'add_members',
    editorID,
    time,
    messageID: `${messageIDsPrefix}/add_members`,
    addedUserIDs: newMemberIDs,
    threadID: existingThreadDetails.threadID,
  };
}

function processAddMembersOperation(
  dmOperation: DMChangeThreadSettingsOperation,
  viewerID: string,
  utilities: ProcessDMOperationUtilities,
) {
  const operation = createAddMembersOperation(dmOperation, viewerID);
  if (operation.type === 'add_viewer_to_thread_members') {
    return createAddViewerToThreadMembersResults(operation, viewerID);
  } else {
    return createAddNewMembersResults(operation, viewerID, utilities);
  }
}

const changeThreadSettingsSpec: DMOperationSpec<DMChangeThreadSettingsOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMChangeThreadSettingsOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const {
        editorID,
        time,
        changes,
        messageIDsPrefix,
        existingThreadDetails,
      } = dmOperation;
      const { name, description, color, avatar } = changes;
      const threadID = existingThreadDetails.threadID;

      let threadInfoToUpdate: ?(RawThreadInfo | LegacyRawThreadInfo) =
        utilities.threadInfos[threadID];
      const updateInfos: Array<ClientUpdateInfo> = [];
      const rawMessageInfos: Array<RawMessageInfo> = [];

      if (changes.newMemberIDs && changes.newMemberIDs.length > 0) {
        const addMembersResult = processAddMembersOperation(
          dmOperation,
          viewerID,
          utilities,
        );
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

      const repliesCountUpdate = createRepliesCountUpdate(
        threadInfoToUpdate,
        rawMessageInfos,
      );
      if (repliesCountUpdate) {
        updateInfos.push(repliesCountUpdate);
      } else if (values(changedFields).length > 0) {
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
    },
    canBeProcessed(
      dmOperation: DMChangeThreadSettingsOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) {
      const operation = createAddMembersOperation(dmOperation, viewerID);
      if (operation.type === 'add_viewer_to_thread_members') {
        return addViewerToThreadMembersSpec.canBeProcessed(
          operation,
          viewerID,
          utilities,
        );
      } else if (
        utilities.threadInfos[dmOperation.existingThreadDetails.threadID]
      ) {
        return { isProcessingPossible: true };
      }
      return {
        isProcessingPossible: false,
        reason: {
          type: 'missing_thread',
          threadID: dmOperation.existingThreadDetails.threadID,
        },
      };
    },
  });

export { changeThreadSettingsSpec };
