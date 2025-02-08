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
  type RawRestoreEntryMessageInfo,
  rawRestoreEntryMessageInfoValidator,
  type RestoreEntryMessageData,
  type RestoreEntryMessageInfo,
} from '../../types/messages/restore-entry.js';
import type { ThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { prettyDate } from '../../utils/date-utils.js';
import { type EntityText, ET } from '../../utils/entity-text.js';

type RestoreEntryMessageSpec = MessageSpec<
  RestoreEntryMessageData,
  RawRestoreEntryMessageInfo,
  RestoreEntryMessageInfo,
> & {
  // We need to explicitly type this as non-optional so that
  // it can be referenced from messageContentForClientDB below
  +messageContentForServerDB: (
    data: RestoreEntryMessageData | RawRestoreEntryMessageInfo,
  ) => string,
  ...
};

export const restoreEntryMessageSpec: RestoreEntryMessageSpec = Object.freeze({
  messageContentForServerDB(
    data: RestoreEntryMessageData | RawRestoreEntryMessageInfo,
  ): string {
    return JSON.stringify({
      entryID: data.entryID,
      date: data.date,
      text: data.text,
    });
  },

  messageContentForClientDB(data: RawRestoreEntryMessageInfo): string {
    return restoreEntryMessageSpec.messageContentForServerDB(data);
  },

  rawMessageInfoFromServerDBRow(row: Object): RawRestoreEntryMessageInfo {
    const content = JSON.parse(row.content);
    return {
      type: messageTypes.RESTORE_ENTRY,
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
  ): RawRestoreEntryMessageInfo {
    invariant(
      clientDBMessageInfo.content !== undefined &&
        clientDBMessageInfo.content !== null,
      'content must be defined for RestoreEntry',
    );
    const content = JSON.parse(clientDBMessageInfo.content);
    const rawRestoreEntryMessageInfo: RawRestoreEntryMessageInfo = {
      type: messageTypes.RESTORE_ENTRY,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      entryID: content.entryID,
      date: content.date,
      text: content.text,
    };
    return rawRestoreEntryMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawRestoreEntryMessageInfo,
    creator: RelativeUserInfo,
  ): RestoreEntryMessageInfo {
    return {
      type: messageTypes.RESTORE_ENTRY,
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
    messageData: RestoreEntryMessageData,
    id: ?string,
  ): RawRestoreEntryMessageInfo {
    invariant(id, 'RawRestoreEntryMessageInfo needs id');
    return { ...messageData, id };
  },

  robotext(messageInfo: RestoreEntryMessageInfo): EntityText {
    const date = prettyDate(messageInfo.date);
    const creator = ET.user({ userInfo: messageInfo.creator });
    const { text } = messageInfo;
    return ET`${creator} restored an event scheduled for ${date}: "${text}"`;
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): Promise<NotifTexts> {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.RESTORE_ENTRY,
      'messageInfo should be messageTypes.RESTORE_ENTRY!',
    );

    const thread = ET.thread({ display: 'shortName', threadInfo });
    const creator = ET.user({ userInfo: messageInfo.creator });
    const date = prettyDate(messageInfo.date);

    const prefix = ET`${creator}`;
    let body = ET`restored an event in ${thread}`;
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

  validator: rawRestoreEntryMessageInfoValidator,
});
