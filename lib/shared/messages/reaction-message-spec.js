// @flow

import invariant from 'invariant';

import type { PlatformDetails } from '../../types/device-types';
import {
  assertMessageType,
  messageTypes,
  type MessageInfo,
  type ClientDBMessageInfo,
} from '../../types/message-types';
import type {
  ReactionMessageData,
  RawReactionMessageInfo,
  ReactionMessageInfo,
} from '../../types/messages/reaction';
import type { RawUnsupportedMessageInfo } from '../../types/messages/unsupported';
import type { NotifTexts } from '../../types/notif-types';
import type { ThreadInfo } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import { removeCreatorAsViewer } from '../message-utils';
import { threadIsGroupChat } from '../thread-utils';
import { stringForUser } from '../user-utils';
import { hasMinCodeVersion } from '../version-utils';
import type {
  MessageSpec,
  MessageTitleParam,
  NotificationTextsParams,
} from './message-spec';
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
      reaction: data.reaction,
      action: data.action,
    });
  },

  messageContentForClientDB(data: RawReactionMessageInfo): string {
    return JSON.stringify({
      targetMessageID: data.targetMessageID,
      reaction: data.reaction,
      action: data.action,
    });
  },

  messageTitle({
    messageInfo,
    viewerContext,
  }: MessageTitleParam<ReactionMessageInfo>) {
    let validMessageInfo: ReactionMessageInfo = (messageInfo: ReactionMessageInfo);
    if (viewerContext === 'global_viewer') {
      validMessageInfo = removeCreatorAsViewer(validMessageInfo);
    }

    const creator = stringForUser(validMessageInfo.creator);
    const preview =
      validMessageInfo.action === 'add_reaction'
        ? 'liked a message'
        : 'unliked a message';
    return `${creator} ${preview}`;
  },

  rawMessageInfoFromServerDBRow(row: Object): RawReactionMessageInfo {
    invariant(
      row.targetMessageID !== null && row.targetMessageID !== undefined,
      'targetMessageID should be set',
    );

    const content = JSON.parse(row.content);

    return {
      type: messageTypes.REACTION,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      targetMessageID: row.targetMessageID.toString(),
      reaction: content.reaction,
      action: content.action,
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
      action: content.action,
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
      action: rawMessageInfo.action,
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
    if (hasMinCodeVersion(platformDetails, 167)) {
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
      robotext: 'liked a message',
      unsupportedMessageInfo: rawMessageInfo,
    };
  },

  unshimMessageInfo(unwrapped: RawReactionMessageInfo): RawReactionMessageInfo {
    return unwrapped;
  },

  notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
    params: NotificationTextsParams,
  ): NotifTexts {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.REACTION,
      'messageInfo should be reaction type',
    );

    const userString = stringForUser(messageInfo.creator);
    const body =
      messageInfo.action === 'add_reaction'
        ? 'liked a message'
        : 'unliked a message';

    let merged;
    if (!threadInfo.name && !threadIsGroupChat(threadInfo)) {
      merged = `${userString} ${body}`;
    } else {
      const threadName = params.notifThreadName(threadInfo);
      merged = `${userString} ${body} in ${threadName}`;
    }

    return {
      merged,
      body,
      title: threadInfo.uiName,
      prefix: userString,
    };
  },

  notificationCollapseKey(rawMessageInfo: RawReactionMessageInfo): string {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
      rawMessageInfo.targetMessageID,
    );
  },

  generatesNotifs: () => true,
});
