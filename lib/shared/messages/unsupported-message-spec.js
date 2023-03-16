// @flow

import invariant from 'invariant';

import { pushTypes, type MessageSpec } from './message-spec.js';
import {
  messageTypes,
  type ClientDBMessageInfo,
} from '../../types/message-types.js';
import type {
  RawUnsupportedMessageInfo,
  UnsupportedMessageInfo,
} from '../../types/messages/unsupported.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { ET, type EntityText } from '../../utils/entity-text.js';

export const unsupportedMessageSpec: MessageSpec<
  null,
  RawUnsupportedMessageInfo,
  UnsupportedMessageInfo,
> = Object.freeze({
  messageContentForClientDB(data: RawUnsupportedMessageInfo): string {
    return JSON.stringify({
      robotext: data.robotext,
      dontPrefixCreator: data.dontPrefixCreator,
      unsupportedMessageInfo: data.unsupportedMessageInfo,
    });
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawUnsupportedMessageInfo {
    invariant(
      clientDBMessageInfo.content !== undefined &&
        clientDBMessageInfo.content !== null,
      'content must be defined for Unsupported',
    );
    const content = JSON.parse(clientDBMessageInfo.content);
    const rawUnsupportedMessageInfo: RawUnsupportedMessageInfo = {
      type: messageTypes.UNSUPPORTED,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      robotext: content.robotext,
      dontPrefixCreator: content.dontPrefixCreator,
      unsupportedMessageInfo: content.unsupportedMessageInfo,
    };
    return rawUnsupportedMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawUnsupportedMessageInfo,
    creator: RelativeUserInfo,
  ): UnsupportedMessageInfo {
    return {
      type: messageTypes.UNSUPPORTED,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      robotext: rawMessageInfo.robotext,
      dontPrefixCreator: rawMessageInfo.dontPrefixCreator,
      unsupportedMessageInfo: rawMessageInfo.unsupportedMessageInfo,
    };
  },

  robotext(messageInfo: UnsupportedMessageInfo): EntityText {
    if (messageInfo.dontPrefixCreator) {
      return ET`${messageInfo.robotext}`;
    }
    const creator = ET.user({ userInfo: messageInfo.creator });
    return ET`${creator} ${messageInfo.robotext}`;
  },

  generatesNotifs: async () => pushTypes.NOTIF,
});
