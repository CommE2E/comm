// @flow

import invariant from 'invariant';

import type { PlatformDetails } from '../../types/device-types.js';
import type {
  MessageInfo,
  RawSidebarSourceMessageInfo,
  SidebarSourceMessageData,
  SidebarSourceMessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types.js';
import { messageTypes } from '../../types/message-types.js';
import type { RawUnsupportedMessageInfo } from '../../types/messages/unsupported.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { ThreadInfo } from '../../types/thread-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { hasMinCodeVersion } from '../version-utils.js';
import type {
  CreateMessageInfoParams,
  MessageSpec,
  NotificationTextsParams,
  RawMessageInfoFromServerDBRowParams,
} from './message-spec.js';
import { assertSingleMessageInfo } from './utils.js';

export const sidebarSourceMessageSpec: MessageSpec<
  SidebarSourceMessageData,
  RawSidebarSourceMessageInfo,
  SidebarSourceMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data: SidebarSourceMessageData | RawSidebarSourceMessageInfo,
  ): string {
    const sourceMessageID = data.sourceMessage?.id;
    invariant(sourceMessageID, 'Source message id should be set');
    return JSON.stringify({
      sourceMessageID,
    });
  },

  messageContentForClientDB(data: RawSidebarSourceMessageInfo): string {
    invariant(
      data.sourceMessage && data.sourceMessage.id,
      'sourceMessage and sourceMessage.id should be defined',
    );
    return JSON.stringify(data.sourceMessage);
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawSidebarSourceMessageInfo {
    invariant(
      clientDBMessageInfo.content !== undefined &&
        clientDBMessageInfo.content !== null,
      'content must be defined',
    );
    const sourceMessage = JSON.parse(clientDBMessageInfo.content);
    const rawSidebarSourceMessageInfo: RawSidebarSourceMessageInfo = {
      type: messageTypes.SIDEBAR_SOURCE,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      sourceMessage,
    };
    return rawSidebarSourceMessageInfo;
  },

  messageTitle() {
    invariant(false, 'Cannot call messageTitle on sidebarSourceMessageSpec');
  },

  rawMessageInfoFromServerDBRow(
    row: Object,
    params: RawMessageInfoFromServerDBRowParams,
  ): RawSidebarSourceMessageInfo {
    const { derivedMessages } = params;
    invariant(derivedMessages, 'Derived messages should be provided');

    const content = JSON.parse(row.content);
    const sourceMessage = derivedMessages.get(content.sourceMessageID);
    if (!sourceMessage) {
      console.warn(
        `Message with id ${row.id} has a derived message ` +
          `${content.sourceMessageID} which is not present in the database`,
      );
    }
    return {
      type: messageTypes.SIDEBAR_SOURCE,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      sourceMessage,
    };
  },

  createMessageInfo(
    rawMessageInfo: RawSidebarSourceMessageInfo,
    creator: RelativeUserInfo,
    params: CreateMessageInfoParams,
  ): ?SidebarSourceMessageInfo {
    if (!rawMessageInfo.sourceMessage) {
      return null;
    }
    const sourceMessage = params.createMessageInfoFromRaw(
      rawMessageInfo.sourceMessage,
    );
    invariant(
      sourceMessage &&
        sourceMessage.type !== messageTypes.SIDEBAR_SOURCE &&
        sourceMessage.type !== messageTypes.REACTION,
      'Sidebars can not be created from SIDEBAR SOURCE OR REACTION',
    );

    return {
      type: messageTypes.SIDEBAR_SOURCE,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      sourceMessage,
    };
  },

  rawMessageInfoFromMessageData(
    messageData: SidebarSourceMessageData,
    id: ?string,
  ): RawSidebarSourceMessageInfo {
    invariant(id, 'RawSidebarSourceMessageInfo needs id');
    return { ...messageData, id };
  },

  shimUnsupportedMessageInfo(
    rawMessageInfo: RawSidebarSourceMessageInfo,
    platformDetails: ?PlatformDetails,
  ): RawSidebarSourceMessageInfo | RawUnsupportedMessageInfo {
    // TODO determine min code version
    if (
      hasMinCodeVersion(platformDetails, 75) &&
      rawMessageInfo.sourceMessage
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
      robotext: 'first message in thread',
      dontPrefixCreator: true,
      unsupportedMessageInfo: rawMessageInfo,
    };
  },

  unshimMessageInfo(
    unwrapped: RawSidebarSourceMessageInfo,
  ): RawSidebarSourceMessageInfo {
    return unwrapped;
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
    params: NotificationTextsParams,
  ): Promise<NotifTexts> {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.SIDEBAR_SOURCE,
      'messageInfo should be messageTypes.SIDEBAR_SOURCE!',
    );
    const sourceMessageInfo = messageInfo.sourceMessage;
    return await params.notificationTexts([sourceMessageInfo], threadInfo);
  },

  generatesNotifs: async () => undefined,

  startsThread: true,
});
