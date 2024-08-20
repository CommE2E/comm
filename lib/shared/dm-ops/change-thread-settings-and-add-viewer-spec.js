// @flow

import {
  addViewerToThreadMembersSpec,
  createAddViewerToThreadMembersResults,
  createAddViewerToThreadMembersMessageDataFromDMOp,
} from './add-viewer-to-thread-members-spec.js';
import {
  processChangeSettingsOperation,
  createChangeSettingsMessageDatasAndUpdate,
} from './change-thread-settings-spec.js';
import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMChangeThreadSettingsAndAddViewerOperation } from '../../types/dm-ops.js';
import type { MessageData } from '../../types/message-types.js';
import { values } from '../../utils/objects.js';

function createAddViewerAndMembersOperation(
  dmOperation: DMChangeThreadSettingsAndAddViewerOperation,
) {
  const { editorID, time, messageIDsPrefix, changes, existingThreadDetails } =
    dmOperation;
  const newMemberIDs =
    changes.newMemberIDs && changes.newMemberIDs.length > 0
      ? [...new Set(changes.newMemberIDs)]
      : [];
  return {
    type: 'add_viewer_to_thread_members',
    editorID,
    time,
    messageID: `${messageIDsPrefix}/add_members`,
    addedUserIDs: newMemberIDs,
    existingThreadDetails,
  };
}

function processAddViewerToThreadMembersOperation(
  dmOperation: DMChangeThreadSettingsAndAddViewerOperation,
  viewerID: string,
) {
  const operation = createAddViewerAndMembersOperation(dmOperation);
  if (operation.addedUserIDs.length === 0) {
    return null;
  }
  return createAddViewerToThreadMembersResults(operation, viewerID);
}

const changeThreadSettingsAndAddViewerSpec: DMOperationSpec<DMChangeThreadSettingsAndAddViewerOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMChangeThreadSettingsAndAddViewerOperation,
    ) => {
      const messageDatas: Array<MessageData> = [];
      const addNewMembersOperation =
        createAddViewerAndMembersOperation(dmOperation);
      if (addNewMembersOperation) {
        const addNewMembersMessageData =
          createAddViewerToThreadMembersMessageDataFromDMOp(
            addNewMembersOperation,
          );
        messageDatas.push(addNewMembersMessageData);
      }

      const { fieldNameToMessageData } =
        createChangeSettingsMessageDatasAndUpdate(dmOperation);
      messageDatas.push(...values(fieldNameToMessageData));
      return { messageDatas };
    },
    processDMOperation: async (
      dmOperation: DMChangeThreadSettingsAndAddViewerOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const addMembersResult = processAddViewerToThreadMembersOperation(
        dmOperation,
        viewerID,
      );

      return processChangeSettingsOperation(
        dmOperation,
        viewerID,
        utilities,
        addMembersResult,
      );
    },
    canBeProcessed(
      dmOperation: DMChangeThreadSettingsAndAddViewerOperation,
      viewerID: string,
      utilities: ProcessDMOperationUtilities,
    ) {
      const operation = createAddViewerAndMembersOperation(dmOperation);
      return addViewerToThreadMembersSpec.canBeProcessed(
        operation,
        viewerID,
        utilities,
      );
    },
    supportsAutoRetry: true,
  });

export { changeThreadSettingsAndAddViewerSpec };
