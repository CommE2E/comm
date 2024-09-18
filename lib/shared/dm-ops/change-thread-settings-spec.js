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
import type { RawMessageInfo } from '../../types/message-types';
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
  +fieldNameToMessageData: {
    +[fieldName: string]: {
      +messageData: ChangeSettingsMessageData,
      +rawMessageInfo: RawMessageInfo,
    },
  },
  +threadInfoUpdate: DMThreadSettingsChanges,
} {
  const { changes, editorID, time, messageIDsPrefix } = dmOperation;
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

  if (avatar || avatar === null) {
    threadInfoUpdate.avatar = avatar;
  }

  const fieldNameToMessageData: {
    [fieldName: string]: {
      +messageData: ChangeSettingsMessageData,
      +rawMessageInfo: RawMessageInfo,
    },
  } = {};

  const { avatar: avatarObject, ...rest } = threadInfoUpdate;
  let normalizedThreadInfoUpdate;
  if (avatarObject) {
    normalizedThreadInfoUpdate = {
      ...rest,
      avatar: JSON.stringify(avatarObject),
    };
  } else if (avatarObject === null) {
    // clear thread avatar
    normalizedThreadInfoUpdate = { ...rest, avatar: '' };
  } else {
    normalizedThreadInfoUpdate = { ...rest };
  }

  for (const fieldName in normalizedThreadInfoUpdate) {
    const value = normalizedThreadInfoUpdate[fieldName];
    const messageData: ChangeSettingsMessageData = {
      type: messageTypes.CHANGE_SETTINGS,
      threadID,
      creatorID: editorID,
      time,
      field: fieldName,
      value: value,
    };
    const rawMessageInfo = rawMessageInfoFromMessageData(
      messageData,
      `${messageIDsPrefix}/${fieldName}`,
    );
    fieldNameToMessageData[fieldName] = { messageData, rawMessageInfo };
  }

  return { fieldNameToMessageData, threadInfoUpdate };
}

const changeThreadSettingsSpec: DMOperationSpec<DMChangeThreadSettingsOperation> =
  Object.freeze({
    notificationsCreationData: async (
      dmOperation: DMChangeThreadSettingsOperation,
    ) => {
      const { fieldNameToMessageData } =
        createChangeSettingsMessageDatasAndUpdate(dmOperation);

      return { messageDatasWithMessageInfos: values(fieldNameToMessageData) };
    },
    processDMOperation: async (
      dmOperation: DMChangeThreadSettingsOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
      const { time } = dmOperation;
      const threadID = getThreadIDFromChangeThreadSettingsDMOp(dmOperation);

      const threadInfo: ?RawThreadInfo = utilities.threadInfos[threadID];
      const updateInfos: Array<ClientUpdateInfo> = [];

      const { fieldNameToMessageData, threadInfoUpdate } =
        createChangeSettingsMessageDatasAndUpdate(dmOperation);

      const messageDataWithMessageInfoPairs = values(fieldNameToMessageData);
      const rawMessageInfos = messageDataWithMessageInfoPairs.map(
        ({ rawMessageInfo }) => rawMessageInfo,
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

      if (messageDataWithMessageInfoPairs.length > 0) {
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
        blobOps: [],
      };
    },
    canBeProcessed: async (
      dmOperation: DMChangeThreadSettingsOperation,
      utilities: ProcessDMOperationUtilities,
    ) => {
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
