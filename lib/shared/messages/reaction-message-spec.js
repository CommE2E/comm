// @flow

import invariant from 'invariant';

import {
  pushTypes,
  type MessageSpec,
  type MessageTitleParam,
  type GeneratesNotifsParams,
} from './message-spec.js';
import { assertSingleMessageInfo, joinResult } from './utils.js';
import type { PlatformDetails } from '../../types/device-types.js';
import {
  assertMessageType,
  messageTypes,
} from '../../types/message-types-enum.js';
import {
  type MessageInfo,
  type ClientDBMessageInfo,
} from '../../types/message-types.js';
import type {
  ReactionMessageData,
  RawReactionMessageInfo,
  ReactionMessageInfo,
} from '../../types/messages/reaction.js';
import type { RawUnsupportedMessageInfo } from '../../types/messages/unsupported.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { ThreadInfo } from '../../types/thread-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { ET } from '../../utils/entity-text.js';
import { threadIsGroupChat } from '../thread-utils.js';
import { hasMinCodeVersion } from '../version-utils.js';

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

  messageTitle({ messageInfo }: MessageTitleParam<ReactionMessageInfo>) {
    const creator = ET.user({ userInfo: messageInfo.creator });
    const preview =
      messageInfo.action === 'add_reaction'
        ? `reacted ${messageInfo.reaction} to a message`
        : 'unreacted to a message';
    return ET`${creator} ${preview}`;
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
      'content must be defined for Reaction',
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
      robotext: 'reacted to a message',
      unsupportedMessageInfo: rawMessageInfo,
    };
  },

  unshimMessageInfo(unwrapped: RawReactionMessageInfo): RawReactionMessageInfo {
    return unwrapped;
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): Promise<NotifTexts> {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.REACTION,
      'messageInfo should be reaction type',
    );

    const creator = ET.user({ userInfo: messageInfo.creator });
    const body =
      messageInfo.action === 'add_reaction'
        ? `reacted ${messageInfo.reaction} to your message`
        : 'unreacted to your message';

    let merged = ET`${creator} ${body}`;
    if (threadInfo.name || threadIsGroupChat(threadInfo)) {
      const thread = ET.thread({ display: 'shortName', threadInfo });
      merged = ET`${merged} in ${thread}`;
    }

    return {
      merged,
      body,
      title: threadInfo.uiName,
      prefix: ET`${creator}`,
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

  generatesNotifs: async (
    rawMessageInfo: RawReactionMessageInfo,
    messageData: ReactionMessageData,
    params: GeneratesNotifsParams,
  ) => {
    const { action } = rawMessageInfo;
    const { notifTargetUserID, fetchMessageInfoByID } = params;

    const targetMessageInfo = await fetchMessageInfoByID(
      rawMessageInfo.targetMessageID,
    );

    if (targetMessageInfo?.creatorID !== notifTargetUserID) {
      return undefined;
    }
    return action === 'add_reaction' ? pushTypes.NOTIF : pushTypes.RESCIND;
  },
});
