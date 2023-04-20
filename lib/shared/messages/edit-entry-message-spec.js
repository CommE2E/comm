// @flow

import invariant from 'invariant';

import { pushTypes, type MessageSpec } from './message-spec.js';
import { joinResult } from './utils.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types.js';
import type {
  EditEntryMessageData,
  EditEntryMessageInfo,
  RawEditEntryMessageInfo,
} from '../../types/messages/edit-entry.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { ThreadInfo } from '../../types/thread-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { prettyDate } from '../../utils/date-utils.js';
import { ET, type EntityText } from '../../utils/entity-text.js';
import { notifTextsForEntryCreationOrEdit } from '../notif-utils.js';

export const editEntryMessageSpec: MessageSpec<
  EditEntryMessageData,
  RawEditEntryMessageInfo,
  EditEntryMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data: EditEntryMessageData | RawEditEntryMessageInfo,
  ): string {
    return JSON.stringify({
      entryID: data.entryID,
      date: data.date,
      text: data.text,
    });
  },

  messageContentForClientDB(data: RawEditEntryMessageInfo): string {
    return this.messageContentForServerDB(data);
  },

  rawMessageInfoFromServerDBRow(row: Object): RawEditEntryMessageInfo {
    const content = JSON.parse(row.content);
    return {
      type: messageTypes.EDIT_ENTRY,
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
  ): RawEditEntryMessageInfo {
    invariant(
      clientDBMessageInfo.content !== null &&
        clientDBMessageInfo.content !== undefined,
      'content must be defined for EditEntry',
    );
    const content = JSON.parse(clientDBMessageInfo.content);
    const rawEditEntryMessageInfo: RawEditEntryMessageInfo = {
      type: messageTypes.EDIT_ENTRY,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      entryID: content.entryID,
      date: content.date,
      text: content.text,
    };
    return rawEditEntryMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawEditEntryMessageInfo,
    creator: RelativeUserInfo,
  ): EditEntryMessageInfo {
    return {
      type: messageTypes.EDIT_ENTRY,
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
    messageData: EditEntryMessageData,
    id: ?string,
  ): RawEditEntryMessageInfo {
    invariant(id, 'RawEditEntryMessageInfo needs id');
    return { ...messageData, id };
  },

  robotext(messageInfo: EditEntryMessageInfo): EntityText {
    const date = prettyDate(messageInfo.date);
    const creator = ET.user({ userInfo: messageInfo.creator });
    const { text } = messageInfo;
    return ET`${creator} updated the text of an event scheduled for ${date}: "${text}"`;
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): Promise<NotifTexts> {
    return notifTextsForEntryCreationOrEdit(messageInfos, threadInfo);
  },

  notificationCollapseKey(rawMessageInfo: RawEditEntryMessageInfo): string {
    return joinResult(rawMessageInfo.creatorID, rawMessageInfo.entryID);
  },

  generatesNotifs: async () => pushTypes.NOTIF,
});
