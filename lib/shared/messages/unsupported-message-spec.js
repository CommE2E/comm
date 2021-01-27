// @flow

import { messageTypes } from '../../types/message-types';
import type {
  RawUnsupportedMessageInfo,
  UnsupportedMessageInfo,
} from '../../types/message/unsupported';
import type { MessageSpec } from './message-spec';

export const unsupportedMessageSpec: MessageSpec<
  null,
  RawUnsupportedMessageInfo,
  UnsupportedMessageInfo,
> = Object.freeze({
  createMessageInfo(rawMessageInfo, creator) {
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

  robotext(messageInfo, creator) {
    if (messageInfo.dontPrefixCreator) {
      return messageInfo.robotext;
    }
    return `${creator} ${messageInfo.robotext}`;
  },

  generatesNotifs: true,
});
