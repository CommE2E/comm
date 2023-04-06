// @flow

import invariant from 'invariant';

import {
  pushTypes,
  type MessageSpec,
  type RobotextParams,
} from './message-spec.js';
import { joinResult } from './utils.js';
import { messageTypes } from '../../types/message-types.js';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types.js';
import type {
  ChangeSettingsMessageData,
  ChangeSettingsMessageInfo,
  RawChangeSettingsMessageInfo,
} from '../../types/messages/change-settings.js';
import type { NotifTexts } from '../../types/notif-types.js';
import { assertThreadType } from '../../types/thread-types.js';
import type { ThreadInfo } from '../../types/thread-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { ET, type EntityText } from '../../utils/entity-text.js';
import { validHexColorRegex } from '../account-utils.js';
import { notifRobotextForMessageInfo } from '../notif-utils.js';
import { threadLabel } from '../thread-utils.js';

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
      'content must be defined for ChangeSettings',
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
    params: RobotextParams,
  ): EntityText {
    const creator = ET.user({ userInfo: messageInfo.creator });
    const thread = ET.thread({
      display: 'alwaysDisplayShortName',
      threadID: messageInfo.threadID,
      threadType: params.threadInfo?.type,
      parentThreadID: params.threadInfo?.parentThreadID,
      possessive: true,
    });
    if (
      (messageInfo.field === 'name' || messageInfo.field === 'description') &&
      messageInfo.value.toString() === ''
    ) {
      return ET`${creator} cleared ${thread} ${messageInfo.field}`;
    }
    if (messageInfo.field === 'avatar') {
      return ET`${creator} updated ${thread} ${messageInfo.field}`;
    }

    let value;
    if (
      messageInfo.field === 'color' &&
      messageInfo.value.toString().match(validHexColorRegex)
    ) {
      value = ET.color({ hex: `#${messageInfo.value}` });
    } else if (messageInfo.field === 'type') {
      invariant(
        typeof messageInfo.value === 'number',
        'messageInfo.value should be number for thread type change ',
      );
      const newThreadType = assertThreadType(messageInfo.value);
      value = threadLabel(newThreadType);
    } else {
      value = messageInfo.value.toString();
    }
    return ET`${creator} updated ${thread} ${messageInfo.field} to "${value}"`;
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): Promise<NotifTexts> {
    const mostRecentMessageInfo = messageInfos[0];
    invariant(
      mostRecentMessageInfo.type === messageTypes.CHANGE_SETTINGS,
      'messageInfo should be messageTypes.CHANGE_SETTINGS!',
    );
    const body = notifRobotextForMessageInfo(mostRecentMessageInfo, threadInfo);
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

  generatesNotifs: async () => pushTypes.NOTIF,
});
