// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types';
import type {
  EditEntryMessageData,
  EditEntryMessageInfo,
  RawEditEntryMessageInfo,
} from '../../types/messages/edit-entry';
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
import type {
  MessageSpec,
  MessageTitleParam,
  NotificationTextsParams,
} from './message-spec';
import { joinResult } from './utils';

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

  messageTitle({
    messageInfo,
    threadInfo,
    viewerContext,
  }: MessageTitleParam<EditEntryMessageInfo>) {
    let validMessageInfo: EditEntryMessageInfo = (messageInfo: EditEntryMessageInfo);
    if (viewerContext === 'global_viewer') {
      validMessageInfo = removeCreatorAsViewer(validMessageInfo);
    }
    return robotextToRawString(
      robotextForMessageInfo(validMessageInfo, threadInfo),
    );
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
      'content must be defined',
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

  robotext(messageInfo: EditEntryMessageInfo, creator: string): string {
    const date = prettyDate(messageInfo.date);
    return (
      `${creator} updated the text of an event scheduled for ` +
      `${date}: "${encodeURI(messageInfo.text)}"`
    );
  },

  notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
    params: NotificationTextsParams,
  ): NotifTexts {
    const hasCreateEntry = messageInfos.some(
      messageInfo => messageInfo.type === messageTypes.CREATE_ENTRY,
    );
    const messageInfo = messageInfos[0];
    if (!hasCreateEntry) {
      invariant(
        messageInfo.type === messageTypes.EDIT_ENTRY,
        'messageInfo should be messageTypes.EDIT_ENTRY!',
      );
      const body =
        `updated the text of an event in ` +
        `${params.notifThreadName(threadInfo)} scheduled for ` +
        `${prettyDate(messageInfo.date)}: "${messageInfo.text}"`;
      const prefix = stringForUser(messageInfo.creator);
      const merged = `${prefix} ${body}`;
      return {
        merged,
        title: threadInfo.uiName,
        body,
        prefix,
      };
    }
    invariant(
      messageInfo.type === messageTypes.CREATE_ENTRY ||
        messageInfo.type === messageTypes.EDIT_ENTRY,
      'messageInfo should be messageTypes.CREATE_ENTRY/EDIT_ENTRY!',
    );
    const prefix = stringForUser(messageInfo.creator);
    const body =
      `created an event in ${params.notifThreadName(threadInfo)} ` +
      `scheduled for ${prettyDate(messageInfo.date)}: "${messageInfo.text}"`;
    const merged = `${prefix} ${body}`;
    return {
      merged,
      title: threadInfo.uiName,
      body,
      prefix,
    };
  },

  notificationCollapseKey(rawMessageInfo: RawEditEntryMessageInfo): string {
    return joinResult(rawMessageInfo.creatorID, rawMessageInfo.entryID);
  },

  generatesNotifs: async () => true,
});
