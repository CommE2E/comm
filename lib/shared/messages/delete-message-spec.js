// @flow

import invariant from 'invariant';

import type { MessageSpec } from './message-spec.js';
import {
  assertMessageType,
  messageTypes,
} from '../../types/message-types-enum.js';
import type { ClientDBMessageInfo } from '../../types/message-types.js';
import type {
  DeleteMessageData,
  DeleteMessageInfo,
  RawDeleteMessageInfo,
} from '../../types/messages/delete.js';
import { rawDeleteMessageInfoValidator } from '../../types/messages/delete.js';
import type { RelativeUserInfo } from '../../types/user-types.js';

export const deleteMessageSpec: MessageSpec<
  DeleteMessageData,
  RawDeleteMessageInfo,
  DeleteMessageInfo,
> = Object.freeze({
  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawDeleteMessageInfo {
    const messageType = assertMessageType(parseInt(clientDBMessageInfo.type));
    invariant(
      messageType === messageTypes.DELETE_MESSAGE,
      'message must be of type DELETE_MESSAGE',
    );
    invariant(
      clientDBMessageInfo.content !== undefined &&
        clientDBMessageInfo.content !== null,
      'content must be defined for DeleteMessage',
    );
    const content = JSON.parse(clientDBMessageInfo.content);

    return {
      type: messageTypes.DELETE_MESSAGE,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      targetMessageID: content.targetMessageID,
    };
  },

  createMessageInfo(
    rawMessageInfo: RawDeleteMessageInfo,
    creator: RelativeUserInfo,
  ): DeleteMessageInfo {
    return {
      type: messageTypes.DELETE_MESSAGE,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      targetMessageID: rawMessageInfo.targetMessageID,
    };
  },

  canBeSidebarSource: false,
  canBePinned: false,
  validator: rawDeleteMessageInfoValidator,
});
