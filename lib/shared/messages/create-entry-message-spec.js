// @flow

import invariant from 'invariant';

import { pushTypes, type MessageSpec } from './message-spec.js';
import { joinResult } from './utils.js';
import { messageTypes } from '../../types/message-types.js';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types.js';
import type {
  CreateEntryMessageData,
  CreateEntryMessageInfo,
  RawCreateEntryMessageInfo,
} from '../../types/messages/create-entry.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { ThreadInfo } from '../../types/thread-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { prettyDate } from '../../utils/date-utils.js';
import { ET, type EntityText } from '../../utils/entity-text.js';
import { notifTextsForEntryCreationOrEdit } from '../notif-utils.js';

export const createEntryMessageSpec: MessageSpec<
  CreateEntryMessageData,
  RawCreateEntryMessageInfo,
  CreateEntryMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data: CreateEntryMessageData | RawCreateEntryMessageInfo,
  ): string {
    return JSON.stringify({
      entryID: data.entryID,
      date: data.date,
      text: data.text,
    });
  },

  messageContentForClientDB(data: RawCreateEntryMessageInfo): string {
    return this.messageContentForServerDB(data);
  },

  rawMessageInfoFromServerDBRow(row: Object): RawCreateEntryMessageInfo {
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

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawCreateEntryMessageInfo {
    invariant(
      clientDBMessageInfo.content !== undefined &&
        clientDBMessageInfo.content !== null,
      'content must be defined for CreateEntry',
    );
    const content = JSON.parse(clientDBMessageInfo.content);
    const rawCreateEntryMessageInfo: RawCreateEntryMessageInfo = {
      type: messageTypes.CREATE_ENTRY,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      entryID: content.entryID,
      date: content.date,
      text: content.text,
    };
    return rawCreateEntryMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawCreateEntryMessageInfo,
    creator: RelativeUserInfo,
  ): CreateEntryMessageInfo {
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

  rawMessageInfoFromMessageData(
    messageData: CreateEntryMessageData,
    id: ?string,
  ): RawCreateEntryMessageInfo {
    invariant(id, 'RawCreateEntryMessageInfo needs id');
    return { ...messageData, id };
  },

  robotext(messageInfo: CreateEntryMessageInfo): EntityText {
    const date = prettyDate(messageInfo.date);
    const creator = ET.user({ userInfo: messageInfo.creator });
    const { text } = messageInfo;
    return ET`${creator} created an event scheduled for ${date}: "${text}"`;
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): Promise<NotifTexts> {
    return notifTextsForEntryCreationOrEdit(messageInfos, threadInfo);
  },

  notificationCollapseKey(rawMessageInfo: RawCreateEntryMessageInfo): string {
    return joinResult(rawMessageInfo.creatorID, rawMessageInfo.entryID);
  },

  generatesNotifs: async () => pushTypes.NOTIF,
});
