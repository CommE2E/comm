// @flow

import invariant from 'invariant';

import type { MessageSpec, RobotextParams } from './message-spec.js';
import { joinResult } from './utils.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types.js';
import type {
  LeaveThreadMessageData,
  LeaveThreadMessageInfo,
  RawLeaveThreadMessageInfo,
} from '../../types/messages/leave-thread.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { ThreadInfo } from '../../types/thread-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import {
  ET,
  type EntityText,
  pluralizeEntityText,
} from '../../utils/entity-text.js';
import { values } from '../../utils/objects.js';

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
    return ET`${creator} left ${ET.thread({
      display: 'alwaysDisplayShortName',
      threadID: messageInfo.threadID,
      threadType: params.threadInfo?.type,
      parentThreadID: params.threadInfo?.parentThreadID,
    })}`;
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): Promise<NotifTexts> {
    const leaverBeavers = {};
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

  generatesNotifs: async () => undefined,
});
