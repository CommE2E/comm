// @flow

import uuid from 'uuid';

import { addMembersSpec } from './add-members-spec.js';
import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type { DMChangeThreadSettingsOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type { RawMessageInfo } from '../../types/message-types.js';
import type { RawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { LegacyRawThreadInfo } from '../../types/thread-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { values } from '../../utils/objects.js';
import { firstLine } from '../../utils/string-utils.js';
import { validChatNameRegex } from '../../utils/validation-utils.js';

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
        threadInfo,
        rawMessageInfos,
        truncationStatus,
        rawEntryInfos,
      } = dmOperation;
      const {
        name: untrimmedName,
        description,
        color,
        parentThreadID,
        avatar,
        type: threadType,
      } = changes;
      const threadID = threadInfo.id;

      const newMemberIDs =
        changes.newMemberIDs && changes.newMemberIDs.length > 0
          ? [...new Set(changes.newMemberIDs)]
          : null;

      let threadInfoToUpdate: ?(RawThreadInfo | LegacyRawThreadInfo) =
        utilities.getThreadInfo(threadID);
      if (!threadInfoToUpdate && !newMemberIDs?.includes(viewerID)) {
        // We can't perform this operation now. It should be queued for later.
        return {
          rawMessageInfos: [],
          updateInfos: [],
        };
      }

      const updateInfos: Array<ClientUpdateInfo> = [];
      const generatedRawMessageInfos: Array<RawMessageInfo> = [];

      if (newMemberIDs) {
        const addMembersResult = await addMembersSpec.processDMOperation(
          {
            type: 'add_members',
            editorID,
            time,
            messageID: `${messageIDsPrefix}/add_members`,
            addedUserIDs: newMemberIDs,
            threadInfo,
            rawMessageInfos,
            truncationStatus,
            rawEntryInfos,
          },
          viewerID,
          utilities,
        );
        const threadInfoFromUpdates = addMembersResult.updateInfos.find(
          update =>
            update.type === updateTypes.UPDATE_THREAD ||
            update.type === updateTypes.JOIN_THREAD,
        )?.threadInfo;
        if (threadInfoFromUpdates) {
          threadInfoToUpdate = threadInfoFromUpdates;
        }
        updateInfos.push(...addMembersResult.updateInfos);
        generatedRawMessageInfos.push(...addMembersResult.rawMessageInfos);
      }

      if (!threadInfoToUpdate || !threadInfoToUpdate.thick) {
        // We can't perform this operation now. It should be queued for later.
        return {
          rawMessageInfos: [],
          updateInfos: [],
        };
      }

      const changedFields: { [string]: string | number } = {};

      if (untrimmedName !== undefined && untrimmedName !== null) {
        const name = firstLine(untrimmedName);
        if (name.search(validChatNameRegex) === -1) {
          return {
            rawMessageInfos: [],
            updateInfos: [],
          };
        }
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
        const newColor = color.toLowerCase();
        changedFields.color = newColor;
        threadInfoToUpdate = {
          ...threadInfoToUpdate,
          color: newColor,
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
        threadInfoToUpdate = {
          ...threadInfoToUpdate,
          avatar: threadInfo.avatar,
        };
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
        generatedRawMessageInfos.push({
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
        rawMessageInfos: generatedRawMessageInfos,
        updateInfos,
      };
    },
  });

export { changeThreadSettingsSpec };
