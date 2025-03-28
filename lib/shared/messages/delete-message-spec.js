// @flow

import invariant from 'invariant';

import type { MessageSpec, MessageTitleParam } from './message-spec.js';
import type { PlatformDetails } from '../../types/device-types.js';
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
import type { RawUnsupportedMessageInfo } from '../../types/messages/unsupported.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { ET } from '../../utils/entity-text.js';
import { FUTURE_CODE_VERSION, hasMinCodeVersion } from '../version-utils.js';

export const deleteMessageSpec: MessageSpec<
  DeleteMessageData,
  RawDeleteMessageInfo,
  DeleteMessageInfo,
> = Object.freeze({
  messageContentForClientDB(data: RawDeleteMessageInfo): string {
    return JSON.stringify({
      targetMessageID: data.targetMessageID,
    });
  },

  messageTitle({ messageInfo }: MessageTitleParam<DeleteMessageInfo>) {
    const creator = ET.user({ userInfo: messageInfo.creator });
    return ET`${creator} deleted a message`;
  },

  rawMessageInfoFromServerDBRow(row: Object): RawDeleteMessageInfo {
    invariant(
      row.targetMessageID !== null && row.targetMessageID !== undefined,
      'targetMessageID should be set',
    );

    return {
      type: messageTypes.DELETE_MESSAGE,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      targetMessageID: row.targetMessageID.toString(),
    };
  },

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

  rawMessageInfoFromMessageData(
    messageData: DeleteMessageData,
    id: ?string,
  ): RawDeleteMessageInfo {
    invariant(id, 'RawDeleteMessageInfo needs id');
    return { ...messageData, id };
  },

  shimUnsupportedMessageInfo(
    rawMessageInfo: RawDeleteMessageInfo,
    platformDetails: ?PlatformDetails,
  ): RawDeleteMessageInfo | RawUnsupportedMessageInfo {
    if (
      hasMinCodeVersion(platformDetails, {
        native: FUTURE_CODE_VERSION,
        web: FUTURE_CODE_VERSION,
      })
    ) {
      return rawMessageInfo;
    }
    const { id } = rawMessageInfo;
    invariant(id !== null && id !== undefined, 'id should be set on server');

    return {
      type: messageTypes.UNSUPPORTED,
      id,
      threadID: rawMessageInfo.threadID,
      creatorID: rawMessageInfo.creatorID,
      time: rawMessageInfo.time,
      robotext: 'deleted a message',
      unsupportedMessageInfo: rawMessageInfo,
    };
  },

  unshimMessageInfo(unwrapped: RawDeleteMessageInfo): RawDeleteMessageInfo {
    return unwrapped;
  },

  canBeSidebarSource: false,

  canBePinned: false,

  canBeRenderedIndependently: false,

  validator: rawDeleteMessageInfoValidator,
});
