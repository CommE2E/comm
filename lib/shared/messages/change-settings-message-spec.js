// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types';
import type {
  ChangeSettingsMessageData,
  ChangeSettingsMessageInfo,
  RawChangeSettingsMessageInfo,
} from '../../types/messages/change-settings';
import type { NotifTexts } from '../../types/notif-types';
import { assertThreadType } from '../../types/thread-types';
import type { ThreadInfo } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import { validHexColorRegex } from '../account-utils';
import {
  robotextToRawString,
  robotextForMessageInfo,
  removeCreatorAsViewer,
} from '../message-utils';
import { threadLabel } from '../thread-utils';
import type {
  MessageSpec,
  MessageTitleParam,
  NotificationTextsParams,
  RobotextParams,
} from './message-spec';
import { joinResult } from './utils';

export const changeSettingsMessageSpec: MessageSpec<
  ChangeSettingsMessageData,
  RawChangeSettingsMessageInfo,
  ChangeSettingsMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data: ChangeSettingsMessageData | RawChangeSettingsMessageInfo,
  ): string {
    return JSON.stringify({
      [data.field]: data.value,
    });
  },

  messageContentForClientDB(data: RawChangeSettingsMessageInfo): string {
    return this.messageContentForServerDB(data);
  },

  messageTitle({
    messageInfo,
    threadInfo,
    viewerContext,
  }: MessageTitleParam<ChangeSettingsMessageInfo>) {
    let validMessageInfo: ChangeSettingsMessageInfo = (messageInfo: ChangeSettingsMessageInfo);
    if (viewerContext === 'global_viewer') {
      validMessageInfo = removeCreatorAsViewer(validMessageInfo);
    }
    return robotextToRawString(
      robotextForMessageInfo(validMessageInfo, threadInfo),
    );
  },

  rawMessageInfoFromServerDBRow(row: Object): RawChangeSettingsMessageInfo {
    const content = JSON.parse(row.content);
    const field = Object.keys(content)[0];
    return {
      type: messageTypes.CHANGE_SETTINGS,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      field,
      value: content[field],
    };
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawChangeSettingsMessageInfo {
    invariant(
      clientDBMessageInfo.content !== undefined &&
        clientDBMessageInfo.content !== null,
      'content must be defined',
    );
    const content = JSON.parse(clientDBMessageInfo.content);
    const field = Object.keys(content)[0];
    const rawChangeSettingsMessageInfo: RawChangeSettingsMessageInfo = {
      type: messageTypes.CHANGE_SETTINGS,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      field,
      value: content[field],
    };
    return rawChangeSettingsMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawChangeSettingsMessageInfo,
    creator: RelativeUserInfo,
  ): ChangeSettingsMessageInfo {
    return {
      type: messageTypes.CHANGE_SETTINGS,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      field: rawMessageInfo.field,
      value: rawMessageInfo.value,
    };
  },

  rawMessageInfoFromMessageData(
    messageData: ChangeSettingsMessageData,
    id: ?string,
  ): RawChangeSettingsMessageInfo {
    invariant(id, 'RawChangeSettingsMessageInfo needs id');
    return { ...messageData, id };
  },

  robotext(
    messageInfo: ChangeSettingsMessageInfo,
    creator: string,
    params: RobotextParams,
  ): string {
    if (
      (messageInfo.field === 'name' || messageInfo.field === 'description') &&
      messageInfo.value.toString() === ''
    ) {
      return `${creator} cleared ${params.encodedThreadEntity(
        messageInfo.threadID,
        'the chat',
      )}'s ${messageInfo.field}`;
    }
    let value;
    if (
      messageInfo.field === 'color' &&
      messageInfo.value.toString().match(validHexColorRegex)
    ) {
      value = `<#${messageInfo.value}|c${messageInfo.threadID}>`;
    } else if (messageInfo.field === 'type') {
      invariant(
        typeof messageInfo.value === 'number',
        'messageInfo.value should be number for thread type change ',
      );
      const newThreadType = assertThreadType(messageInfo.value);
      value = threadLabel(newThreadType);
    } else {
      value = messageInfo.value;
    }
    return (
      `${creator} updated ` +
      `${params.encodedThreadEntity(messageInfo.threadID, 'the chat')}'s ` +
      `${messageInfo.field} to "${value}"`
    );
  },

  notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
    params: NotificationTextsParams,
  ): NotifTexts {
    const mostRecentMessageInfo = messageInfos[0];
    invariant(
      mostRecentMessageInfo.type === messageTypes.CHANGE_SETTINGS,
      'messageInfo should be messageTypes.CHANGE_SETTINGS!',
    );
    const body = params.strippedRobotextForMessageInfo(
      mostRecentMessageInfo,
      threadInfo,
    );
    return {
      merged: body,
      title: threadInfo.uiName,
      body,
    };
  },

  notificationCollapseKey(
    rawMessageInfo: RawChangeSettingsMessageInfo,
  ): string {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
      rawMessageInfo.field,
    );
  },

  generatesNotifs: () => true,
});
