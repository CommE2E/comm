// @flow

import { messageTypes } from '../../types/message-types';
import type {
  CreateEntryMessageData,
  CreateEntryMessageInfo,
  RawCreateEntryMessageInfo,
} from '../../types/message/create-entry';
import { prettyDate } from '../../utils/date-utils';
import type { MessageSpec } from './message-spec';

export const createEntryMessageSpec: MessageSpec<
  CreateEntryMessageData,
  RawCreateEntryMessageInfo,
  CreateEntryMessageInfo,
> = Object.freeze({
  messageContent(data) {
    return JSON.stringify({
      entryID: data.entryID,
      date: data.date,
      text: data.text,
    });
  },

  rawMessageInfoFromRow(row) {
    const content = JSON.parse(row.content);
    return {
      type: messageTypes.CREATE_ENTRY,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      entryID: content.entryID,
      date: content.date,
      text: content.text,
    };
  },

  createMessageInfo(rawMessageInfo, creator) {
    return {
      type: messageTypes.CREATE_ENTRY,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      entryID: rawMessageInfo.entryID,
      date: rawMessageInfo.date,
      text: rawMessageInfo.text,
    };
  },

  rawMessageInfoFromMessageData(messageData, id) {
    return { ...messageData, id };
  },

  robotext(messageInfo, creator) {
    const date = prettyDate(messageInfo.date);
    return (
      `${creator} created an event scheduled for ${date}: ` +
      `"${messageInfo.text}"`
    );
  },
});
