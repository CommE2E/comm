// @flow

import uuid from 'uuid';

import { createAddNewMembersResults } from './add-members-spec.js';
import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import { createUpdateUnreadCountUpdate } from './dm-op-utils.js';
import type { DMChangeThreadSettingsOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type { RawMessageInfo } from '../../types/message-types.js';
import type { RawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { LegacyRawThreadInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { values } from '../../utils/objects.js';

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
      const {
        name,
        description,
        color,
        parentThreadID,
        avatar,
        type: threadType,
      } = changes;
      const threadID = existingThreadDetails.threadID;

      const newMemberIDs =
        changes.newMemberIDs && changes.newMemberIDs.length > 0
          ? [...new Set(changes.newMemberIDs)]
          : null;

      let threadInfoToUpdate: ?(RawThreadInfo | LegacyRawThreadInfo) =
        utilities.threadInfos[threadID];
      if (!threadInfoToUpdate && !newMemberIDs?.includes(viewerID)) {
        // We can't perform this operation now. It should be queued for later.
        return {
          rawMessageInfos: [],
          updateInfos: [],
        };
      }

      const updateInfos: Array<ClientUpdateInfo> = [];
      const rawMessageInfos: Array<RawMessageInfo> = [];

      if (newMemberIDs) {
        const addMembersResult = createAddNewMembersResults(
          {
            type: 'add_members',
            editorID,
            time,
            messageID: `${messageIDsPrefix}/add_members`,
            addedUserIDs: newMemberIDs,
            existingThreadDetails,
          },
          viewerID,
          utilities,
        );
        if (addMembersResult.threadInfo) {
          threadInfoToUpdate = addMembersResult.threadInfo;
        }
        updateInfos.push(...addMembersResult.updateInfos);
        rawMessageInfos.push(...addMembersResult.rawMessageInfos);
      }

      if (!threadInfoToUpdate || !threadInfoToUpdate.thick) {
        // We can't perform this operation now. It should be queued for later.
        return {
          rawMessageInfos: [],
          updateInfos: [],
        };
      }

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

      if (parentThreadID !== undefined) {
        // TODO do we want to support this for thick threads?
        return {
          rawMessageInfos: [],
          updateInfos: [],
        };
      }

      if (avatar) {
        changedFields.avatar =
          avatar.type !== 'remove' ? JSON.stringify(avatar) : '';
        // TODO how to create an avatar?
      }

      if (threadType !== null && threadType !== undefined) {
        // TODO do we want to support this for thick threads?
        return {
          rawMessageInfos: [],
          updateInfos: [],
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

      const repliesCountUpdate = createUpdateUnreadCountUpdate(
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
  });

export { changeThreadSettingsSpec };
