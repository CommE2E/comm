// @flow

import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMAddMembersOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';

const addMembersSpec: DMOperationSpec<DMAddMembersOperation> = Object.freeze({
  processDMOperation: async (
    dmOperation: DMAddMembersOperation,
    viewerID: string,
    utilities: ProcessDMOperationUtilities,
  ) => {
    const {
      editorID,
      time,
      messageID,
      addedUserIDs,
      threadInfo,
      rawMessageInfos,
      truncationStatus,
      rawEntryInfos,
    } = dmOperation;
    const addMembersMessage = {
      type: messageTypes.ADD_MEMBERS,
      id: messageID,
      threadID: threadInfo.id,
      creatorID: editorID,
      time,
      addedUserIDs: [...addedUserIDs],
    };

    const viewerIsAdded = addedUserIDs.includes(viewerID);
    const updateInfos: Array<ClientUpdateInfo> = [];
    if (viewerIsAdded) {
      updateInfos.push(
        {
          type: updateTypes.JOIN_THREAD,
          id: uuid.v4(),
          time,
          threadInfo,
          rawMessageInfos,
          truncationStatus,
          rawEntryInfos,
        },
        {
          type: updateTypes.UPDATE_THREAD_READ_STATUS,
          id: uuid.v4(),
          time,
          threadID: threadInfo.id,
          unread: true,
        },
      );
    } else {
      const currentThreadInfo = await utilities.fetchThread(threadInfo.id);
      if (currentThreadInfo?.thick) {
        const newThreadInfo = {
          ...currentThreadInfo,
          members: threadInfo.members,
        };
        updateInfos.push({
          type: updateTypes.UPDATE_THREAD,
          id: uuid.v4(),
          time,
          threadInfo: newThreadInfo,
        });
      }
    }
    return {
      rawMessageInfos: [addMembersMessage],
      updateInfos,
    };
  },
});

export { addMembersSpec };
