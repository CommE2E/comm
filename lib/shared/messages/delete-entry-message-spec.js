// @flow

import invariant from 'invariant';

import { type MessageSpec, messageNotifyTypes } from './message-spec.js';
import { assertSingleMessageInfo } from './utils.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type {
  ClientDBMessageInfo,
  MessageInfo,
} from '../../types/message-types.js';
import {
  type DeleteEntryMessageData,
  type DeleteEntryMessageInfo,
  type RawDeleteEntryMessageInfo,
  rawDeleteEntryMessageInfoValidator,
} from '../../types/messages/delete-entry.js';
import type { ThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { prettyDate } from '../../utils/date-utils.js';
import { type EntityText, ET } from '../../utils/entity-text.js';

type DeleteEntryMessageSpec = MessageSpec<
  DeleteEntryMessageData,
  RawDeleteEntryMessageInfo,
  DeleteEntryMessageInfo,
> & {
  // We need to explicitly type this as non-optional so that
  // it can be referenced from messageContentForClientDB below
  +messageContentForServerDB: (
    data: DeleteEntryMessageData | RawDeleteEntryMessageInfo,
  ) => string,
  ...
};

export const deleteEntryMessageSpec: DeleteEntryMessageSpec = Object.freeze({
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
    return deleteEntryMessageSpec.messageContentForServerDB(data);
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

  getMessageNotifyType: async () => messageNotifyTypes.NOTIF_AND_SET_UNREAD,

  canBeSidebarSource: true,

  canBePinned: false,

  validator: rawDeleteEntryMessageInfoValidator,
});
