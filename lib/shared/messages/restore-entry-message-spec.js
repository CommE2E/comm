// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types';
import type {
  RawRestoreEntryMessageInfo,
  RestoreEntryMessageData,
  RestoreEntryMessageInfo,
} from '../../types/messages/restore-entry';
import type { NotifTexts } from '../../types/notif-types';
import type { ThreadInfo } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import { prettyDate } from '../../utils/date-utils';
import { ET, type EntityText } from '../../utils/entity-text';
import { stringForUser } from '../user-utils';
import {
  pushTypes,
  type MessageSpec,
  type NotificationTextsParams,
} from './message-spec';
import { assertSingleMessageInfo } from './utils';

export const restoreEntryMessageSpec: MessageSpec<
  RestoreEntryMessageData,
  RawRestoreEntryMessageInfo,
  RestoreEntryMessageInfo,
> = Object.freeze({
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
    return this.messageContentForServerDB(data);
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
      'content must be defined',
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

  notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
    params: NotificationTextsParams,
  ): NotifTexts {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.RESTORE_ENTRY,
      'messageInfo should be messageTypes.RESTORE_ENTRY!',
    );
    const prefix = stringForUser(messageInfo.creator);
    const body =
      `restored an event in ${params.notifThreadName(threadInfo)} ` +
      `scheduled for ${prettyDate(messageInfo.date)}: "${messageInfo.text}"`;
    const merged = `${prefix} ${body}`;
    return {
      merged,
      title: threadInfo.uiName,
      body,
      prefix,
    };
  },

  generatesNotifs: async () => pushTypes.NOTIF,
});
