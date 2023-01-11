// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types';
import type {
  DeleteEntryMessageData,
  DeleteEntryMessageInfo,
  RawDeleteEntryMessageInfo,
} from '../../types/messages/delete-entry';
import type { NotifTexts } from '../../types/notif-types';
import type { ThreadInfo } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import { prettyDate } from '../../utils/date-utils';
import {
  robotextToRawString,
  robotextForMessageInfo,
  removeCreatorAsViewer,
} from '../message-utils';
import { stringForUser } from '../user-utils';
import {
  pushTypes,
  type MessageSpec,
  type MessageTitleParam,
  type NotificationTextsParams,
} from './message-spec';
import { assertSingleMessageInfo } from './utils';

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

  messageTitle({
    messageInfo,
    threadInfo,
    viewerContext,
  }: MessageTitleParam<DeleteEntryMessageInfo>) {
    let validMessageInfo: DeleteEntryMessageInfo = (messageInfo: DeleteEntryMessageInfo);
    if (viewerContext === 'global_viewer') {
      validMessageInfo = removeCreatorAsViewer(validMessageInfo);
    }
    return robotextToRawString(
      robotextForMessageInfo(validMessageInfo, threadInfo),
    );
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
      'content must be defined',
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

  robotext(messageInfo: DeleteEntryMessageInfo, creator: string): string {
    const date = prettyDate(messageInfo.date);
    return (
      `${creator} deleted an event scheduled for ${date}: ` +
      `"${encodeURI(messageInfo.text)}"`
    );
  },

  notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
    params: NotificationTextsParams,
  ): NotifTexts {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.DELETE_ENTRY,
      'messageInfo should be messageTypes.DELETE_ENTRY!',
    );
    const prefix = stringForUser(messageInfo.creator);
    const body =
      `deleted an event in ${params.notifThreadName(threadInfo)} ` +
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
