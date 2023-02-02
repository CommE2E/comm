// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types';
import type {
  LeaveThreadMessageData,
  LeaveThreadMessageInfo,
  RawLeaveThreadMessageInfo,
} from '../../types/messages/leave-thread';
import type { NotifTexts } from '../../types/notif-types';
import type { ThreadInfo } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import {
  ET,
  type EntityText,
  entityTextToRawString,
} from '../../utils/entity-text';
import { values } from '../../utils/objects';
import { pluralize } from '../../utils/text-utils';
import {
  robotextForMessageInfo,
  removeCreatorAsViewer,
} from '../message-utils';
import { stringForUser } from '../user-utils';
import type {
  MessageSpec,
  MessageTitleParam,
  NotificationTextsParams,
} from './message-spec';
import { joinResult } from './utils';

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

  messageTitle({
    messageInfo,
    threadInfo,
    viewerContext,
  }: MessageTitleParam<LeaveThreadMessageInfo>) {
    let validMessageInfo: LeaveThreadMessageInfo = (messageInfo: LeaveThreadMessageInfo);
    if (viewerContext === 'global_viewer') {
      validMessageInfo = removeCreatorAsViewer(validMessageInfo);
    }
    return entityTextToRawString(
      robotextForMessageInfo(validMessageInfo, threadInfo),
    );
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

  robotext(messageInfo: LeaveThreadMessageInfo): EntityText {
    const creator = ET.user({ userInfo: messageInfo.creator });
    return ET`${creator} left ${ET.thread({
      display: 'alwaysDisplayShortName',
      threadID: messageInfo.threadID,
    })}`;
  },

  notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
    params: NotificationTextsParams,
  ): NotifTexts {
    const leaverBeavers = {};
    for (const messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageTypes.LEAVE_THREAD,
        'messageInfo should be messageTypes.LEAVE_THREAD!',
      );
      leaverBeavers[messageInfo.creator.id] = messageInfo.creator;
    }
    const leavers = values(leaverBeavers);
    const leaversString = pluralize(leavers.map(stringForUser));

    const body = `${leaversString} left`;
    const merged = `${body} ${params.notifThreadName(threadInfo)}`;
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
