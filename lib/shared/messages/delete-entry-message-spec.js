// @flow

import invariant from 'invariant';

import { pushTypes, type MessageSpec } from './message-spec.js';
import { assertSingleMessageInfo } from './utils.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types.js';
import type {
  DeleteEntryMessageData,
  DeleteEntryMessageInfo,
  RawDeleteEntryMessageInfo,
} from '../../types/messages/delete-entry.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { ThreadInfo } from '../../types/thread-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { prettyDate } from '../../utils/date-utils.js';
import { ET, type EntityText } from '../../utils/entity-text.js';

export const deleteEntryMessageSpec: MessageSpec<
  DeleteEntryMessageData,
  RawDeleteEntryMessageInfo,
  DeleteEntryMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data: DeleteEntryMessageData | RawDeleteEntryMessageInfo,
  ): string {
    return JSON.stringify({
      entryID: data.entryID,
      date: data.date,
      text: data.text,
    });
  },

  messageContentForClientDB(data: RawDeleteEntryMessageInfo): string {
    return this.messageContentForServerDB(data);
  },

  rawMessageInfoFromServerDBRow(row: Object): RawDeleteEntryMessageInfo {
    const content = JSON.parse(row.content);
    return {
      type: messageTypes.DELETE_ENTRY,
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
  ): RawDeleteEntryMessageInfo {
    invariant(
      clientDBMessageInfo.content !== undefined &&
        clientDBMessageInfo.content !== null,
      'content must be defined for DeleteEntry',
    );
    const content = JSON.parse(clientDBMessageInfo.content);
    const rawDeleteEntryMessageInfo: RawDeleteEntryMessageInfo = {
      type: messageTypes.DELETE_ENTRY,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      entryID: content.entryID,
      date: content.date,
      text: content.text,
    };
    return rawDeleteEntryMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawDeleteEntryMessageInfo,
    creator: RelativeUserInfo,
  ): DeleteEntryMessageInfo {
    return {
      type: messageTypes.DELETE_ENTRY,
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
    messageData: DeleteEntryMessageData,
    id: ?string,
  ): RawDeleteEntryMessageInfo {
    invariant(id, 'RawDeleteEntryMessageInfo needs id');
    return { ...messageData, id };
  },

  robotext(messageInfo: DeleteEntryMessageInfo): EntityText {
    const date = prettyDate(messageInfo.date);
    const creator = ET.user({ userInfo: messageInfo.creator });
    const { text } = messageInfo;
    return ET`${creator} deleted an event scheduled for ${date}: "${text}"`;
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): Promise<NotifTexts> {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.DELETE_ENTRY,
      'messageInfo should be messageTypes.DELETE_ENTRY!',
    );

    const thread = ET.thread({ display: 'shortName', threadInfo });
    const creator = ET.user({ userInfo: messageInfo.creator });
    const date = prettyDate(messageInfo.date);

    const prefix = ET`${creator}`;
    let body = ET`deleted an event in ${thread}`;
    body = ET`${body} scheduled for ${date}: "${messageInfo.text}"`;
    const merged = ET`${prefix} ${body}`;

    return {
      merged,
      title: threadInfo.uiName,
      body,
      prefix,
    };
  },

  generatesNotifs: async () => pushTypes.NOTIF,
});
