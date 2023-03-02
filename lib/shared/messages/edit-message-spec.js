// @flow

import invariant from 'invariant';

import { type MessageSpec, type MessageTitleParam } from './message-spec.js';
import {
  assertMessageType,
  messageTypes,
  type ClientDBMessageInfo,
} from '../../types/message-types.js';
import type {
  EditMessageData,
  RawEditMessageInfo,
  EditMessageInfo,
} from '../../types/messages/edit.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { ET } from '../../utils/entity-text.js';

export const editMessageSpec: MessageSpec<
  EditMessageData,
  RawEditMessageInfo,
  EditMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data: EditMessageData | RawEditMessageInfo,
  ): string {
    return data.text;
  },

  messageContentForClientDB(data: RawEditMessageInfo): string {
    return JSON.stringify({
      targetMessageID: data.targetMessageID,
      text: data.text,
    });
  },

  messageTitle({ messageInfo }: MessageTitleParam<EditMessageInfo>) {
    const creator = ET.user({ userInfo: messageInfo.creator });
    return ET`${creator} edited message`;
  },

  rawMessageInfoFromServerDBRow(row: Object): RawEditMessageInfo {
    invariant(
      row.targetMessageID !== null && row.targetMessageID !== undefined,
      'targetMessageID should be set',
    );

    return {
      type: messageTypes.EDIT_MESSAGE,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      targetMessageID: row.targetMessageID.toString(),
      text: row.content,
    };
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawEditMessageInfo {
    const messageType = assertMessageType(parseInt(clientDBMessageInfo.type));
    invariant(
      messageType === messageTypes.EDIT_MESSAGE,
      'message must be of type EDIT_MESSAGE',
    );
    invariant(
      clientDBMessageInfo.content !== undefined &&
        clientDBMessageInfo.content !== null,
      'content must be defined',
    );
    const content = JSON.parse(clientDBMessageInfo.content);

    const rawEditMessageInfo: RawEditMessageInfo = {
      type: messageTypes.EDIT_MESSAGE,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      targetMessageID: content.targetMessageID,
      text: content.text,
    };

    return rawEditMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawEditMessageInfo,
    creator: RelativeUserInfo,
  ): EditMessageInfo {
    return {
      type: messageTypes.EDIT_MESSAGE,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      targetMessageID: rawMessageInfo.targetMessageID,
      text: rawMessageInfo.text,
    };
  },

  rawMessageInfoFromMessageData(
    messageData: EditMessageData,
    id: ?string,
  ): RawEditMessageInfo {
    invariant(id, 'RawEditMessageInfo needs id');
    return { ...messageData, id };
  },

  generatesNotifs: async () => {
    return undefined;
  },
});
