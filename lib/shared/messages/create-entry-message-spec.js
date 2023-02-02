// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types';
import type {
  CreateEntryMessageData,
  CreateEntryMessageInfo,
  RawCreateEntryMessageInfo,
} from '../../types/messages/create-entry';
import type { NotifTexts } from '../../types/notif-types';
import type { ThreadInfo } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import { prettyDate } from '../../utils/date-utils';
import {
  ET,
  type EntityText,
  entityTextToRawString,
} from '../../utils/entity-text';
import {
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
import { joinResult } from './utils';

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

  messageTitle({
    messageInfo,
    threadInfo,
    viewerContext,
  }: MessageTitleParam<CreateEntryMessageInfo>) {
    let validMessageInfo: CreateEntryMessageInfo = (messageInfo: CreateEntryMessageInfo);
    if (viewerContext === 'global_viewer') {
      validMessageInfo = removeCreatorAsViewer(validMessageInfo);
    }
    return entityTextToRawString(
      robotextForMessageInfo(validMessageInfo, threadInfo),
    );
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
      'content must be defined',
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

  notificationCollapseKey(rawMessageInfo: RawCreateEntryMessageInfo): string {
    return joinResult(rawMessageInfo.creatorID, rawMessageInfo.entryID);
  },

  generatesNotifs: async () => pushTypes.NOTIF,
});
