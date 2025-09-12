// @flow

import invariant from 'invariant';

import {
  type GeneratesNotifsParams,
  type MessageSpec,
  type MessageTitleParam,
  messageNotifyTypes,
  type ShowInMessagePreviewParams,
} from './message-spec.js';
import { assertSingleMessageInfo, joinResult } from './utils.js';
import type { PlatformDetails } from '../../types/device-types.js';
import {
  assertMessageType,
  messageTypes,
} from '../../types/message-types-enum.js';
import type {
  ClientDBMessageInfo,
  MessageInfo,
} from '../../types/message-types.js';
import {
  type RawCompoundReactionMessageInfo,
  rawCompoundReactionMessageInfoValidator,
  type CompoundReactionMessageData,
  type CompoundReactionMessageInfo,
} from '../../types/messages/compound-reaction.js';
import type { RawUnsupportedMessageInfo } from '../../types/messages/unsupported.js';
import type { ThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { ET } from '../../utils/entity-text.js';
import { threadIsGroupChat } from '../thread-utils.js';
import { hasMinCodeVersion, NEXT_CODE_VERSION } from '../version-utils.js';

export const compoundReactionMessageSpec: MessageSpec<
  CompoundReactionMessageData,
  RawCompoundReactionMessageInfo,
  CompoundReactionMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data: CompoundReactionMessageData | RawCompoundReactionMessageInfo,
  ): string {
    return JSON.stringify({
      reactions: data.reactions,
    });
  },

  messageContentForClientDB(data: RawCompoundReactionMessageInfo): string {
    return JSON.stringify({
      targetMessageID: data.targetMessageID,
      reactions: data.reactions,
    });
  },

  messageTitle({
    messageInfo,
  }: MessageTitleParam<CompoundReactionMessageInfo>) {
    const reactionCount = `${Object.keys(messageInfo.reactions).length}`;
    const hasViewerReacted = Object.values(messageInfo.reactions).some(
      info => info.viewerReacted,
    );

    if (hasViewerReacted) {
      return ET`You and others reacted to a message`;
    } else {
      return ET`${reactionCount} reactions on a message`;
    }
  },

  rawMessageInfoFromServerDBRow(row: Object): RawCompoundReactionMessageInfo {
    invariant(
      row.targetMessageID !== null && row.targetMessageID !== undefined,
      'targetMessageID should be set',
    );

    const content = JSON.parse(row.content);

    return {
      type: messageTypes.COMPOUND_REACTION,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      targetMessageID: row.targetMessageID.toString(),
      reactions: content.reactions,
    };
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawCompoundReactionMessageInfo {
    const messageType = assertMessageType(parseInt(clientDBMessageInfo.type));
    invariant(
      messageType === messageTypes.COMPOUND_REACTION,
      'message must be of type COMPOUND_REACTION',
    );
    invariant(
      clientDBMessageInfo.content !== undefined &&
        clientDBMessageInfo.content !== null,
      'content must be defined for CompoundReaction',
    );
    const content = JSON.parse(clientDBMessageInfo.content);

    const rawCompoundReactionMessageInfo: RawCompoundReactionMessageInfo = {
      type: messageTypes.COMPOUND_REACTION,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      targetMessageID: content.targetMessageID,
      reactions: content.reactions,
    };

    return rawCompoundReactionMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawCompoundReactionMessageInfo,
    creator: RelativeUserInfo,
  ): CompoundReactionMessageInfo {
    return {
      type: messageTypes.COMPOUND_REACTION,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      time: rawMessageInfo.time,
      targetMessageID: rawMessageInfo.targetMessageID,
      reactions: rawMessageInfo.reactions,
      creator,
    };
  },

  rawMessageInfoFromMessageData(
    messageData: CompoundReactionMessageData,
    id: ?string,
  ): RawCompoundReactionMessageInfo {
    invariant(id, 'RawCompoundReactionMessageInfo needs id');
    return { ...messageData, id };
  },

  shimUnsupportedMessageInfo(
    rawMessageInfo: RawCompoundReactionMessageInfo,
    platformDetails: ?PlatformDetails,
  ): RawCompoundReactionMessageInfo | RawUnsupportedMessageInfo {
    if (
      hasMinCodeVersion(platformDetails, {
        native: NEXT_CODE_VERSION,
        web: NEXT_CODE_VERSION,
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
      robotext: 'sent reactions to a message',
      unsupportedMessageInfo: rawMessageInfo,
    };
  },

  unshimMessageInfo(
    unwrapped: RawCompoundReactionMessageInfo,
  ): RawCompoundReactionMessageInfo {
    return unwrapped;
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): Promise<NotifTexts> {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.COMPOUND_REACTION,
      'messageInfo should be compound reaction type',
    );

    const reactionCount = Object.keys(messageInfo.reactions).length;
    const body = `${reactionCount} reactions to your message`;

    let merged = ET`${body}`;
    if (threadInfo.name || threadIsGroupChat(threadInfo)) {
      const thread = ET.thread({ display: 'shortName', threadInfo });
      merged = ET`${merged} in ${thread}`;
    }

    return {
      merged,
      body,
      title: threadInfo.uiName,
      prefix: ET``,
    };
  },

  notificationCollapseKey(
    rawMessageInfo: RawCompoundReactionMessageInfo,
  ): string {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
      rawMessageInfo.targetMessageID,
    );
  },

  getMessageNotifyType: async (
    rawMessageInfo: RawCompoundReactionMessageInfo,
    params: GeneratesNotifsParams,
  ) => {
    const { notifTargetUserID, fetchMessageInfoByID } = params;

    const targetMessageInfo = await fetchMessageInfoByID(
      rawMessageInfo.targetMessageID,
    );

    if (targetMessageInfo?.creatorID !== notifTargetUserID) {
      return messageNotifyTypes.NONE;
    }

    // Check if any reaction has a positive count
    const hasActiveReactions = Object.values(rawMessageInfo.reactions).some(
      reaction => reaction.count > 0,
    );

    return hasActiveReactions
      ? messageNotifyTypes.NOTIF_AND_SET_UNREAD
      : messageNotifyTypes.RESCIND;
  },

  canBeSidebarSource: false,

  canBePinned: false,

  canBeRenderedIndependently: false,

  validator: rawCompoundReactionMessageInfoValidator,

  showInMessagePreview: (
    messageInfo: CompoundReactionMessageInfo,
    params: ShowInMessagePreviewParams,
  ) => {
    const getOriginalMessageAuthorResult = params.getMessageAuthor(
      messageInfo.targetMessageID,
    );
    if (!getOriginalMessageAuthorResult) {
      return false;
    }
    if (typeof getOriginalMessageAuthorResult === 'string') {
      return getOriginalMessageAuthorResult === params.viewerID;
    }
    return (async () => {
      const originalMessageAuthor = await getOriginalMessageAuthorResult;
      return originalMessageAuthor === params.viewerID;
    })();
  },

  getLastUpdatedTime:
    (
      rawMessageInfo: RawCompoundReactionMessageInfo,
      params: ShowInMessagePreviewParams,
    ) =>
    async () => {
      const getOriginalMessageAuthorResult = params.getMessageAuthor(
        rawMessageInfo.targetMessageID,
      );
      if (!getOriginalMessageAuthorResult) {
        return null;
      }
      if (typeof getOriginalMessageAuthorResult === 'string') {
        return getOriginalMessageAuthorResult === params.viewerID
          ? rawMessageInfo.time
          : null;
      }
      const originalMessageAuthor = await getOriginalMessageAuthorResult;
      return originalMessageAuthor === params.viewerID
        ? rawMessageInfo.time
        : null;
    },
});
