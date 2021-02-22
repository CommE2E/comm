// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  DeleteEntryMessageData,
  DeleteEntryMessageInfo,
  RawDeleteEntryMessageInfo,
} from '../../types/messages/delete-entry';
import { prettyDate } from '../../utils/date-utils';
import {
  robotextToRawString,
  robotextForMessageInfo,
  removeCreatorAsViewer,
} from '../message-utils';
import { stringForUser } from '../user-utils';
import type { MessageSpec, MessageTitleParam } from './message-spec';
import { assertSingleMessageInfo } from './utils';

export const deleteEntryMessageSpec: MessageSpec<
  DeleteEntryMessageData,
  RawDeleteEntryMessageInfo,
  DeleteEntryMessageInfo,
> = Object.freeze({
  messageContent(data: DeleteEntryMessageData): string {
    return JSON.stringify({
      entryID: data.entryID,
      date: data.date,
      text: data.text,
    });
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

  rawMessageInfoFromRow(row: Object): RawDeleteEntryMessageInfo {
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

  createMessageInfo(rawMessageInfo, creator) {
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

  rawMessageInfoFromMessageData(messageData, id) {
    return { ...messageData, id };
  },

  robotext(messageInfo, creator) {
    const date = prettyDate(messageInfo.date);
    return (
      `${creator} deleted an event scheduled for ${date}: ` +
      `"${messageInfo.text}"`
    );
  },

  notificationTexts(messageInfos, threadInfo, params) {
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

  generatesNotifs: true,
});
