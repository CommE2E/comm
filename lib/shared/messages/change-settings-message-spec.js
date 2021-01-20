// @flow

import { messageTypes } from '../../types/message-types';
import type {
  ChangeSettingsMessageData,
  ChangeSettingsMessageInfo,
  RawChangeSettingsMessageInfo,
} from '../../types/message/change-settings';
import type { MessageSpec } from './message-spec';

export const changeSettingsMessageSpec: MessageSpec<
  ChangeSettingsMessageData,
  RawChangeSettingsMessageInfo,
  ChangeSettingsMessageInfo,
> = Object.freeze({
  messageContent(data) {
    return JSON.stringify({
      [data.field]: data.value,
    });
  },

  rawMessageInfoFromRow(row) {
    const content = JSON.parse(row.content);
    const field = Object.keys(content)[0];
    return {
      type: messageTypes.CHANGE_SETTINGS,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      field,
      value: content[field],
    };
  },

  createMessageInfo(rawMessageInfo, creator) {
    return {
      type: messageTypes.CHANGE_SETTINGS,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      field: rawMessageInfo.field,
      value: rawMessageInfo.value,
    };
  },

  rawMessageInfoFromMessageData(messageData, id) {
    return { ...messageData, id };
  },
});
