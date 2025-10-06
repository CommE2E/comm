// @flow

import invariant from 'invariant';

import { messageNotifyTypes, type MessageSpec } from './message-spec.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type { ClientDBMessageInfo } from '../../types/message-types.js';
import {
  type PlainMessageInfo,
  type RawPlainMessageInfo,
  rawPlainMessageInfoValidator,
} from '../../types/messages/plain.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { type EntityText, ET } from '../../utils/entity-text.js';

export const plainMessageSpec: MessageSpec<
  null,
  RawPlainMessageInfo,
  PlainMessageInfo,
> = Object.freeze({
  messageContentForClientDB(data: RawPlainMessageInfo): string {
    return JSON.stringify({
      rawContent: data.rawContent,
    });
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawPlainMessageInfo {
    invariant(
      clientDBMessageInfo.content !== undefined &&
        clientDBMessageInfo.content !== null,
      'content must be defined for Raw',
    );
    const content = JSON.parse(clientDBMessageInfo.content);
    return {
      type: messageTypes.PLAIN,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      rawContent: content.rawContent ?? '',
    };
  },

  createMessageInfo(
    rawMessageInfo: RawPlainMessageInfo,
    creator: RelativeUserInfo,
  ): PlainMessageInfo {
    const messageInfo: PlainMessageInfo = {
      type: messageTypes.PLAIN,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      rawContent: rawMessageInfo.rawContent,
    };
    if (rawMessageInfo.id) {
      return { ...messageInfo, id: rawMessageInfo.id };
    }
    return messageInfo;
  },

  robotext(messageInfo: PlainMessageInfo): EntityText {
    const creator = ET.user({ userInfo: messageInfo.creator });
    return ET`${creator} sent a message`;
  },

  getMessageNotifyType: async () => messageNotifyTypes.NOTIF_AND_SET_UNREAD,

  canBeSidebarSource: false,

  canBePinned: false,

  validator: rawPlainMessageInfoValidator,
});
