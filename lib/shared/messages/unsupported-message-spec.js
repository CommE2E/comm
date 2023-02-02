// @flow

import invariant from 'invariant';

import {
  messageTypes,
  type ClientDBMessageInfo,
} from '../../types/message-types';
import type {
  RawUnsupportedMessageInfo,
  UnsupportedMessageInfo,
} from '../../types/messages/unsupported';
import type { RelativeUserInfo } from '../../types/user-types';
import { ET, type EntityText } from '../../utils/entity-text';
import {
  robotextToRawString,
  robotextForMessageInfo,
  removeCreatorAsViewer,
} from '../message-utils';
import {
  pushTypes,
  type MessageSpec,
  type MessageTitleParam,
} from './message-spec';

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
      'content must be defined',
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

  robotext(messageInfo: UnsupportedMessageInfo): EntityText {
    if (messageInfo.dontPrefixCreator) {
      return ET`${messageInfo.robotext}`;
    }
    const creator = ET.user({ userInfo: messageInfo.creator });
    return ET`${creator} ${messageInfo.robotext}`;
  },

  generatesNotifs: async () => pushTypes.NOTIF,
});
