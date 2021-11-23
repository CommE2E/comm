// @flow

import { messageTypes } from '../../types/message-types';
import type {
  RawUnsupportedMessageInfo,
  UnsupportedMessageInfo,
} from '../../types/messages/unsupported';
import type { RelativeUserInfo } from '../../types/user-types';
import {
  robotextToRawString,
  robotextForMessageInfo,
  removeCreatorAsViewer,
} from '../message-utils';
import type { MessageSpec, MessageTitleParam } from './message-spec';

export const unsupportedMessageSpec: MessageSpec<
  null,
  RawUnsupportedMessageInfo,
  UnsupportedMessageInfo,
> = Object.freeze({
  messageContentForClientDB(data: null | RawUnsupportedMessageInfo): string {
    return JSON.stringify({
      robotext: data?.robotext,
      dontPrefixCreator: data?.dontPrefixCreator,
      unsupportedMessageInfo: data?.unsupportedMessageInfo,
    });
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

  messageTitle({
    messageInfo,
    threadInfo,
    viewerContext,
  }: MessageTitleParam<UnsupportedMessageInfo>) {
    let validMessageInfo: UnsupportedMessageInfo = (messageInfo: UnsupportedMessageInfo);
    if (viewerContext === 'global_viewer') {
      validMessageInfo = removeCreatorAsViewer(validMessageInfo);
    }
    return robotextToRawString(
      robotextForMessageInfo(validMessageInfo, threadInfo),
    );
  },

  robotext(messageInfo: UnsupportedMessageInfo, creator: string): string {
    if (messageInfo.dontPrefixCreator) {
      return messageInfo.robotext;
    }
    return `${creator} ${messageInfo.robotext}`;
  },

  generatesNotifs: true,
});
