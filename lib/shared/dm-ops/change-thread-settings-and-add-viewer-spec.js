// @flow

import {
  addViewerToThreadMembersSpec,
  createAddViewerToThreadMembersResults,
} from './add-viewer-to-thread-members-spec.js';
import { processChangeSettingsOperation } from './change-thread-settings-spec.js';
import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMChangeThreadSettingsAndAddViewerOperation } from '../../types/dm-ops.js';

function createAddMembersOperation(
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
  const operation = createAddMembersOperation(dmOperation);
  if (operation.addedUserIDs.length === 0) {
    return null;
  }
  return createAddViewerToThreadMembersResults(operation, viewerID);
}

const changeThreadSettingsAndAddViewerSpec: DMOperationSpec<DMChangeThreadSettingsAndAddViewerOperation> =
  Object.freeze({
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
      const operation = createAddMembersOperation(dmOperation);
      return addViewerToThreadMembersSpec.canBeProcessed(
        operation,
        viewerID,
        utilities,
      );
    },
  });

export { changeThreadSettingsAndAddViewerSpec };
