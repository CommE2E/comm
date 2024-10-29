// @flow

import invariant from 'invariant';

import type {
  MessageSpec,
  RobotextParams,
  MergeRobotextMessageItemResult,
  ShowInMessagePreviewParams,
} from './message-spec.js';
import { joinResult } from './utils.js';
import type { RobotextChatMessageInfoItem } from '../../selectors/chat-selectors.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type {
  ClientDBMessageInfo,
  MessageInfo,
} from '../../types/message-types.js';
import {
  type JoinThreadMessageData,
  type JoinThreadMessageInfo,
  type RawJoinThreadMessageInfo,
  rawJoinThreadMessageInfoValidator,
} from '../../types/messages/join-thread.js';
import type { ThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { NotifTexts } from '../../types/notif-types.js';
import { threadTypeIsThick } from '../../types/thread-types-enum.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import {
  type EntityText,
  ET,
  pluralizeEntityText,
} from '../../utils/entity-text.js';
import { values } from '../../utils/objects.js';

function getJoinThreadRobotext(
  joinerString: EntityText,
  threadID: string,
  params: RobotextParams,
): EntityText {
  return ET`${joinerString} joined ${ET.thread({
    display: 'alwaysDisplayShortName',
    threadID,
    threadType: params.threadInfo?.type,
    parentThreadID: params.threadInfo?.parentThreadID,
  })}`;
}

export const joinThreadMessageSpec: MessageSpec<
  JoinThreadMessageData,
  RawJoinThreadMessageInfo,
  JoinThreadMessageInfo,
> = Object.freeze({
  rawMessageInfoFromServerDBRow(row: Object): RawJoinThreadMessageInfo {
    return {
      type: messageTypes.JOIN_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
    };
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawJoinThreadMessageInfo {
    const rawJoinThreadMessageInfo: RawJoinThreadMessageInfo = {
      type: messageTypes.JOIN_THREAD,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
    };
    return rawJoinThreadMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawJoinThreadMessageInfo,
    creator: RelativeUserInfo,
  ): JoinThreadMessageInfo {
    return {
      type: messageTypes.JOIN_THREAD,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
    };
  },

  rawMessageInfoFromMessageData(
    messageData: JoinThreadMessageData,
    id: ?string,
  ): RawJoinThreadMessageInfo {
    invariant(id, 'RawJoinThreadMessageInfo needs id');
    return { ...messageData, id };
  },

  robotext(
    messageInfo: JoinThreadMessageInfo,
    params: RobotextParams,
  ): EntityText {
    const creator = ET.user({ userInfo: messageInfo.creator });
    return getJoinThreadRobotext(ET`${creator}`, messageInfo.threadID, params);
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): Promise<NotifTexts> {
    const joinerArray: { [string]: RelativeUserInfo } = {};
    for (const messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageTypes.JOIN_THREAD,
        'messageInfo should be messageTypes.JOIN_THREAD!',
      );
      joinerArray[messageInfo.creator.id] = messageInfo.creator;
    }
    const joiners = values(joinerArray);
    const joiningUsers = pluralizeEntityText(
      joiners.map(user => ET`${ET.user({ userInfo: user })}`),
    );

    const body = ET`${joiningUsers} joined`;
    const thread = ET.thread({ display: 'shortName', threadInfo });
    const merged = ET`${body} ${thread}`;

    return {
      merged,
      title: threadInfo.uiName,
      body,
    };
  },

  notificationCollapseKey(rawMessageInfo: RawJoinThreadMessageInfo): string {
    return joinResult(rawMessageInfo.type, rawMessageInfo.threadID);
  },

  canBeSidebarSource: true,

  canBePinned: false,

  validator: rawJoinThreadMessageInfoValidator,

  mergeIntoPrecedingRobotextMessageItem(
    messageInfo: JoinThreadMessageInfo,
    precedingMessageInfoItem: RobotextChatMessageInfoItem,
    params: RobotextParams,
  ): MergeRobotextMessageItemResult {
    if (precedingMessageInfoItem.messageInfos.length === 0) {
      return { shouldMerge: false };
    }
    for (const precedingMessageInfo of precedingMessageInfoItem.messageInfos) {
      if (precedingMessageInfo.type !== messageTypes.JOIN_THREAD) {
        return { shouldMerge: false };
      }
    }
    const messageInfos = [
      messageInfo,
      ...precedingMessageInfoItem.messageInfos,
    ];
    const joiningUsers = pluralizeEntityText(
      messageInfos.map(info => ET`${ET.user({ userInfo: info.creator })}`),
    );
    const newRobotext = getJoinThreadRobotext(
      joiningUsers,
      messageInfo.threadID,
      params,
    );
    const mergedItem = {
      ...precedingMessageInfoItem,
      messageInfos,
      robotext: newRobotext,
    };
    return { shouldMerge: true, item: mergedItem };
  },

  showInMessagePreview: async (
    messageInfo: JoinThreadMessageInfo,
    params: ShowInMessagePreviewParams,
  ) => threadTypeIsThick(params.threadInfo.type),
});
