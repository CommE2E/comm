// @flow

import invariant from 'invariant';

import {
  assertMessageType,
  messageTypes,
  type ClientDBMessageInfo,
  type ReactionMessageData,
  type RawReactionMessageInfo,
  type ReactionMessageInfo,
} from '../../types/message-types';
import type { RelativeUserInfo } from '../../types/user-types';
import { messagePreviewText } from '../message-utils';
import type { MessageSpec, MessageTitleParam } from './message-spec';

export const reactionMessageSpec: MessageSpec<
  ReactionMessageData,
  RawReactionMessageInfo,
  ReactionMessageInfo,
> = Object.freeze({
  messageContentForClientDB(data: RawReactionMessageInfo): string {
    return JSON.stringify({
      targetMessageID: data.targetMessageID,
      reaction: data.reaction,
    });
  },

  messageTitle({
    messageInfo,
    threadInfo,
    viewerContext,
  }: MessageTitleParam<ReactionMessageInfo>) {
    let validMessageInfo: ReactionMessageInfo = (messageInfo: ReactionMessageInfo);
    if (viewerContext === 'global_viewer') {
      validMessageInfo = {
        ...validMessageInfo,
        creator: { ...messageInfo.creator, isViewer: false },
      };
    }
    return messagePreviewText(validMessageInfo, threadInfo);
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawReactionMessageInfo {
    const messageType = assertMessageType(parseInt(clientDBMessageInfo.type));
    invariant(
      messageType === messageTypes.REACTION,
      'message must be of type REACTION',
    );
    invariant(
      clientDBMessageInfo.content !== undefined &&
        clientDBMessageInfo.content !== null,
      'content must be defined',
    );
    const content = JSON.parse(clientDBMessageInfo.content);

    const rawReactionMessageInfo: RawReactionMessageInfo = {
      type: messageTypes.REACTION,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      targetMessageID: content.targetMessageID,
      reaction: content.reaction,
    };

    return rawReactionMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawReactionMessageInfo,
    creator: RelativeUserInfo,
  ): ReactionMessageInfo {
    return {
      type: messageTypes.REACTION,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      targetMessageID: rawMessageInfo.targetMessageID,
      reaction: rawMessageInfo.reaction,
    };
  },

  generatesNotifs: true,
});
