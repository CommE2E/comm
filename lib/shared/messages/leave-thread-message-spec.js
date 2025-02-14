// @flow

import invariant from 'invariant';

import {
  type MessageSpec,
  type RobotextParams,
  type MergeRobotextMessageItemResult,
  type ShowInMessagePreviewParams,
  messageNotifyTypes,
} from './message-spec.js';
import { joinResult } from './utils.js';
import type { RobotextChatMessageInfoItem } from '../../selectors/chat-selectors.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type {
  ClientDBMessageInfo,
  MessageInfo,
} from '../../types/message-types.js';
import {
  type LeaveThreadMessageData,
  type LeaveThreadMessageInfo,
  type RawLeaveThreadMessageInfo,
  rawLeaveThreadMessageInfoValidator,
} from '../../types/messages/leave-thread.js';
import type { ThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { NotifTexts } from '../../types/notif-types.js';
import { threadTypeIsThick } from '../../types/thread-types-enum.js';
import { threadIDIsThick } from '../../types/thread-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import {
  type EntityText,
  ET,
  pluralizeEntityText,
} from '../../utils/entity-text.js';
import { values } from '../../utils/objects.js';

function getLeaveThreadRobotext(
  leaverString: EntityText,
  threadID: string,
  params: RobotextParams,
): EntityText {
  return ET`${leaverString} left ${ET.thread({
    display: 'alwaysDisplayShortName',
    threadID,
    threadType: params.threadInfo?.type,
    parentThreadID: params.threadInfo?.parentThreadID,
  })}`;
}

export const leaveThreadMessageSpec: MessageSpec<
  LeaveThreadMessageData,
  RawLeaveThreadMessageInfo,
  LeaveThreadMessageInfo,
> = Object.freeze({
  rawMessageInfoFromServerDBRow(row: Object): RawLeaveThreadMessageInfo {
    return {
      type: messageTypes.LEAVE_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
    };
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawLeaveThreadMessageInfo {
    const rawLeaveThreadMessageInfo: RawLeaveThreadMessageInfo = {
      type: messageTypes.LEAVE_THREAD,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
    };
    return rawLeaveThreadMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawLeaveThreadMessageInfo,
    creator: RelativeUserInfo,
  ): LeaveThreadMessageInfo {
    return {
      type: messageTypes.LEAVE_THREAD,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
    };
  },

  rawMessageInfoFromMessageData(
    messageData: LeaveThreadMessageData,
    id: ?string,
  ): RawLeaveThreadMessageInfo {
    invariant(id, 'RawLeaveThreadMessageInfo needs id');
    return { ...messageData, id };
  },

  robotext(
    messageInfo: LeaveThreadMessageInfo,
    params: RobotextParams,
  ): EntityText {
    const creator = ET.user({ userInfo: messageInfo.creator });
    return getLeaveThreadRobotext(ET`${creator}`, messageInfo.threadID, params);
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): Promise<NotifTexts> {
    const leaverBeavers: { [string]: RelativeUserInfo } = {};
    for (const messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageTypes.LEAVE_THREAD,
        'messageInfo should be messageTypes.LEAVE_THREAD!',
      );
      leaverBeavers[messageInfo.creator.id] = messageInfo.creator;
    }
    const leavers = values(leaverBeavers);
    const leavingUsers = pluralizeEntityText(
      leavers.map(user => ET`${ET.user({ userInfo: user })}`),
    );

    const body = ET`${leavingUsers} left`;
    const thread = ET.thread({ display: 'shortName', threadInfo });
    const merged = ET`${body} ${thread}`;

    return {
      merged,
      title: threadInfo.uiName,
      body,
    };
  },

  notificationCollapseKey(rawMessageInfo: RawLeaveThreadMessageInfo): string {
    return joinResult(rawMessageInfo.type, rawMessageInfo.threadID);
  },

  canBeSidebarSource: true,

  canBePinned: false,

  validator: rawLeaveThreadMessageInfoValidator,

  mergeIntoPrecedingRobotextMessageItem(
    messageInfo: LeaveThreadMessageInfo,
    precedingMessageInfoItem: RobotextChatMessageInfoItem,
    params: RobotextParams,
  ): MergeRobotextMessageItemResult {
    if (precedingMessageInfoItem.messageInfos.length === 0) {
      return { shouldMerge: false };
    }
    for (const precedingMessageInfo of precedingMessageInfoItem.messageInfos) {
      if (precedingMessageInfo.type !== messageTypes.LEAVE_THREAD) {
        return { shouldMerge: false };
      }
    }
    const messageInfos = [
      messageInfo,
      ...precedingMessageInfoItem.messageInfos,
    ];
    const leavingUsers = pluralizeEntityText(
      messageInfos.map(info => ET`${ET.user({ userInfo: info.creator })}`),
    );
    const newRobotext = getLeaveThreadRobotext(
      leavingUsers,
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

  showInMessagePreview: (
    messageInfo: LeaveThreadMessageInfo,
    params: ShowInMessagePreviewParams,
  ) => threadTypeIsThick(params.threadInfo.type),

  getLastUpdatedTime: (
    messageInfo: LeaveThreadMessageInfo | RawLeaveThreadMessageInfo,
    params: ShowInMessagePreviewParams,
  ) => (threadTypeIsThick(params.threadInfo.type) ? messageInfo.time : null),

  getMessageNotifyType: async (rawMessageInfo: RawLeaveThreadMessageInfo) =>
    threadIDIsThick(rawMessageInfo.threadID)
      ? messageNotifyTypes.SET_UNREAD
      : messageNotifyTypes.NONE,
});
