// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  EditEntryMessageData,
  EditEntryMessageInfo,
  RawEditEntryMessageInfo,
} from '../../types/messages/edit-entry';
import { prettyDate } from '../../utils/date-utils';
import { stringForUser } from '../user-utils';
import type { MessageSpec } from './message-spec';
import { joinResult } from './utils';

export const editEntryMessageSpec: MessageSpec<
  EditEntryMessageData,
  RawEditEntryMessageInfo,
  EditEntryMessageInfo,
> = Object.freeze({
  messageContent(data) {
    return JSON.stringify({
      entryID: data.entryID,
      date: data.date,
      text: data.text,
    });
  },

  rawMessageInfoFromRow(row) {
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

  createMessageInfo(rawMessageInfo, creator) {
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

  rawMessageInfoFromMessageData(messageData, id) {
    return { ...messageData, id };
  },

  robotext(messageInfo, creator) {
    const date = prettyDate(messageInfo.date);
    return (
      `${creator} updated the text of an event scheduled for ` +
      `${date}: "${messageInfo.text}"`
    );
  },

  notificationTexts(messageInfos, threadInfo, params) {
    const hasCreateEntry = messageInfos.some(
      (messageInfo) => messageInfo.type === messageTypes.CREATE_ENTRY,
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

  notificationCollapseKey(rawMessageInfo) {
    return joinResult(rawMessageInfo.creatorID, rawMessageInfo.entryID);
  },

  generatesNotifs: true,
});
