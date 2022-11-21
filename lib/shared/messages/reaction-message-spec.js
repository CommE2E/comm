// @flow

import invariant from 'invariant';

import type { PlatformDetails } from '../../types/device-types';
import {
  assertMessageType,
  messageTypes,
  type MessageInfo,
  type ClientDBMessageInfo,
  type ReactionMessageData,
  type RawReactionMessageInfo,
  type ReactionMessageInfo,
} from '../../types/message-types';
import type { RawUnsupportedMessageInfo } from '../../types/messages/unsupported';
import type { NotifTexts } from '../../types/notif-types';
import type { ThreadInfo } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import { messagePreviewText } from '../message-utils';
import { stringForUser } from '../user-utils';
import { hasMinCodeVersion } from '../version-utils';
import type { MessageSpec, MessageTitleParam } from './message-spec';
import { assertSingleMessageInfo, joinResult } from './utils';

export const reactionMessageSpec: MessageSpec<
  ReactionMessageData,
  RawReactionMessageInfo,
  ReactionMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data: ReactionMessageData | RawReactionMessageInfo,
  ): string {
    return JSON.stringify({
      targetMessageID: data.targetMessageID,
      reaction: data.reaction,
    });
  },

  messageContentForClientDB(data: RawReactionMessageInfo): string {
    return this.messageContentForServerDB(data);
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

  rawMessageInfoFromServerDBRow(row: Object): RawReactionMessageInfo {
    const content = JSON.parse(row.content);

    return {
      type: messageTypes.REACTION,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      targetMessageID: content.targetMessageID,
      reaction: content.reaction,
    };
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

  rawMessageInfoFromMessageData(
    messageData: ReactionMessageData,
    id: ?string,
  ): RawReactionMessageInfo {
    invariant(id, 'RawReactionMessageInfo needs id');
    return { ...messageData, id };
  },

  shimUnsupportedMessageInfo(
    rawMessageInfo: RawReactionMessageInfo,
    platformDetails: ?PlatformDetails,
  ): RawReactionMessageInfo | RawUnsupportedMessageInfo {
    // TODO: change minCodeVersion to correct number when ready
    if (hasMinCodeVersion(platformDetails, 999)) {
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
      robotext: 'sent a reaction',
      unsupportedMessageInfo: rawMessageInfo,
    };
  },

  notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): NotifTexts {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    const prefix = stringForUser(messageInfo.creator);
    const title = threadInfo.uiName;
    const body = 'reacted to a message';
    const merged = `${prefix} ${body}`;

    return {
      merged,
      body,
      title,
      prefix,
    };
  },

  notificationCollapseKey(rawMessageInfo: RawReactionMessageInfo): string {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
    );
  },

  generatesNotifs: true,
});
