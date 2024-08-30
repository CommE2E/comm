// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import type {
  DMOperationSpec,
  ProcessDMOperationUtilities,
} from './dm-op-spec.js';
import type {
  DMChangeThreadSettingsOperation,
  DMThreadSettingsChanges,
} from '../../types/dm-ops.js';
import type { MessageData, RawMessageInfo } from '../../types/message-types';
import { messageTypes } from '../../types/message-types-enum.js';
import type { ChangeSettingsMessageData } from '../../types/messages/change-settings.js';
import type {
  RawThreadInfo,
  ThickRawThreadInfo,
} from '../../types/minimally-encoded-thread-permissions-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { values } from '../../utils/objects.js';
import { rawMessageInfoFromMessageData } from '../message-utils.js';

function getThreadIDFromChangeThreadSettingsDMOp(
  dmOperation: DMChangeThreadSettingsOperation,
): string {
  return dmOperation.type === 'change_thread_settings'
    ? dmOperation.threadID
    : dmOperation.existingThreadDetails.threadID;
}

function createChangeSettingsMessageDatasAndUpdate(
  dmOperation: DMChangeThreadSettingsOperation,
): {
  +fieldNameToMessageData: { +[fieldName: string]: ChangeSettingsMessageData },
  +threadInfoUpdate: DMThreadSettingsChanges,
} {
  const { changes, editorID, time } = dmOperation;
  const { name, description, color, avatar } = changes;
  const threadID = getThreadIDFromChangeThreadSettingsDMOp(dmOperation);

  const threadInfoUpdate: { ...DMThreadSettingsChanges } = {};

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

const changeThreadSettingsSpec: DMOperationSpec<DMChangeThreadSettingsOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMChangeThreadSettingsOperation,
    ) => {
      const messageDatas: Array<MessageData> = [];

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
      const { time, messageIDsPrefix } = dmOperation;
      const threadID = getThreadIDFromChangeThreadSettingsDMOp(dmOperation);

      const threadInfo: RawThreadInfo = utilities.threadInfos[threadID];
      const updateInfos: Array<ClientUpdateInfo> = [];
      const rawMessageInfos: Array<RawMessageInfo> = [];

      const { fieldNameToMessageData, threadInfoUpdate } =
        createChangeSettingsMessageDatasAndUpdate(dmOperation);

      const fieldNameToMessageDataPairs = Object.entries(
        fieldNameToMessageData,
      );
      rawMessageInfos.push(
        ...fieldNameToMessageDataPairs.map(([fieldName, messageData]) =>
          rawMessageInfoFromMessageData(
            messageData,
            `${messageIDsPrefix}/${fieldName}`,
          ),
        ),
      );

      invariant(threadInfo?.thick, 'Thread should be thick');
      let threadInfoToUpdate: ThickRawThreadInfo = threadInfo;
      for (const fieldName in threadInfoUpdate) {
        const timestamp = threadInfoToUpdate.timestamps[fieldName];
        if (timestamp < time) {
          threadInfoToUpdate = {
            ...threadInfoToUpdate,
            [fieldName]: threadInfoUpdate[fieldName],
            timestamps: {
              ...threadInfoToUpdate.timestamps,
              [fieldName]: time,
            },
          };
        }
      }

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

export { changeThreadSettingsSpec, createChangeSettingsMessageDatasAndUpdate };
