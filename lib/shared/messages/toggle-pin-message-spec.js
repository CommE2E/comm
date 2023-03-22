// @flow

import invariant from 'invariant';

import type {
  MessageSpec,
  RobotextParams,
  RawMessageInfoFromServerDBRowParams,
} from './message-spec.js';
import { joinResult, assertSingleMessageInfo } from './utils.js';
import type { PlatformDetails } from '../../types/device-types';
import { messageTypes } from '../../types/message-types.js';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types.js';
import type {
  TogglePinMessageData,
  TogglePinMessageInfo,
  RawTogglePinMessageInfo,
} from '../../types/messages/toggle-pin.js';
import type { RawUnsupportedMessageInfo } from '../../types/messages/unsupported';
import type { NotifTexts } from '../../types/notif-types.js';
import type { ThreadInfo } from '../../types/thread-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { ET, type EntityText } from '../../utils/entity-text.js';
import { getPinnedContentFromClientDBMessageInfo } from '../../utils/message-ops-utils.js';
import { getPinnedContentFromMessage } from '../message-utils.js';
import { hasMinCodeVersion } from '../version-utils.js';

export const togglePinMessageSpec: MessageSpec<
  TogglePinMessageData,
  RawTogglePinMessageInfo,
  TogglePinMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data: TogglePinMessageData | RawTogglePinMessageInfo,
  ): string {
    return JSON.stringify({
      action: data.action,
      threadID: data.threadID,
      targetMessageID: data.targetMessageID,
    });
  },

  messageContentForClientDB(data: RawTogglePinMessageInfo): string {
    return this.messageContentForServerDB(data);
  },

  rawMessageInfoFromServerDBRow(
    row: Object,
    params: RawMessageInfoFromServerDBRowParams,
  ): RawTogglePinMessageInfo {
    const content = JSON.parse(row.content);
    const { derivedMessages } = params;
    const targetMessage = derivedMessages.get(content.targetMessageID);
    invariant(targetMessage, 'targetMessage should be defined');

    return {
      type: messageTypes.TOGGLE_PIN,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      targetMessageID: content.targetMessageID.toString(),
      action: content.action,
      pinnedContent: getPinnedContentFromMessage(targetMessage),
      time: row.time,
      creatorID: row.creatorID.toString(),
    };
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawTogglePinMessageInfo {
    invariant(
      clientDBMessageInfo.content !== undefined &&
        clientDBMessageInfo.content !== null,
      'content must be defined for TogglePin',
    );
    const content = JSON.parse(clientDBMessageInfo.content);
    const pinnedContent =
      getPinnedContentFromClientDBMessageInfo(clientDBMessageInfo);

    const rawTogglePinMessageInfo: RawTogglePinMessageInfo = {
      type: messageTypes.TOGGLE_PIN,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      targetMessageID: content.targetMessageID,
      action: content.action,
      pinnedContent,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
    };
    return rawTogglePinMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawTogglePinMessageInfo,
    creator: RelativeUserInfo,
  ): TogglePinMessageInfo {
    return {
      type: messageTypes.TOGGLE_PIN,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      targetMessageID: rawMessageInfo.targetMessageID,
      action: rawMessageInfo.action,
      pinnedContent: rawMessageInfo.pinnedContent,
      creator,
      time: rawMessageInfo.time,
    };
  },

  rawMessageInfoFromMessageData(
    messageData: TogglePinMessageData,
    id: ?string,
  ): RawTogglePinMessageInfo {
    invariant(id, 'RawTogglePinMessageInfo needs id');
    return { ...messageData, id };
  },

  robotext(
    messageInfo: TogglePinMessageInfo,
    params: RobotextParams,
  ): EntityText {
    const creator = ET.user({ userInfo: messageInfo.creator });
    const action = messageInfo.action === 'pin' ? 'pinned' : 'unpinned';
    const pinnedContent = messageInfo.pinnedContent;
    const preposition = messageInfo.action === 'pin' ? 'in' : 'from';
    return ET`${creator} ${action} ${pinnedContent} ${preposition} ${ET.thread({
      display: 'alwaysDisplayShortName',
      threadID: messageInfo.threadID,
      threadType: params.threadInfo?.type,
      parentThreadID: params.threadInfo?.parentThreadID,
    })}`;
  },

  shimUnsupportedMessageInfo(
    rawMessageInfo: RawTogglePinMessageInfo,
    platformDetails: ?PlatformDetails,
  ): RawTogglePinMessageInfo | RawUnsupportedMessageInfo {
    // TODO: Change before landing
    if (hasMinCodeVersion(platformDetails, 10000)) {
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
      robotext: 'toggled a message pin',
      unsupportedMessageInfo: rawMessageInfo,
    };
  },

  unshimMessageInfo(
    unwrapped: RawTogglePinMessageInfo,
  ): RawTogglePinMessageInfo {
    return unwrapped;
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): Promise<NotifTexts> {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.TOGGLE_PIN,
      'messageInfo should be messageTypes.TOGGLE_PIN!',
    );

    const creator = ET.user({ userInfo: messageInfo.creator });
    const body =
      messageInfo.action === 'pin'
        ? ET`${creator} pinned ${messageInfo.pinnedContent} in`
        : ET`${creator} unpinned ${messageInfo.pinnedContent} from`;
    const thread = ET.thread({ display: 'shortName', threadInfo });
    const merged = ET`${body} ${thread}`;

    return {
      merged,
      title: threadInfo.uiName,
      body,
    };
  },

  notificationCollapseKey(rawMessageInfo: RawTogglePinMessageInfo): string {
    return joinResult(
      rawMessageInfo.type,
      rawMessageInfo.threadID,
      rawMessageInfo.creatorID,
      rawMessageInfo.targetMessageID,
    );
  },

  generatesNotifs: async () => undefined,
});
