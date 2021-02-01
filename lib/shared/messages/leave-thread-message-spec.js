// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  LeaveThreadMessageData,
  LeaveThreadMessageInfo,
  RawLeaveThreadMessageInfo,
} from '../../types/messages/leave-thread';
import { values } from '../../utils/objects';
import { pluralize } from '../../utils/text-utils';
import { stringForUser } from '../user-utils';
import type { MessageSpec } from './message-spec';
import { joinResult } from './utils';

export const leaveThreadMessageSpec: MessageSpec<
  LeaveThreadMessageData,
  RawLeaveThreadMessageInfo,
  LeaveThreadMessageInfo,
> = Object.freeze({
  rawMessageInfoFromRow(row) {
    return {
      type: messageTypes.LEAVE_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
    };
  },

  createMessageInfo(rawMessageInfo, creator) {
    return {
      type: messageTypes.LEAVE_THREAD,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
    };
  },

  rawMessageInfoFromMessageData(messageData, id) {
    return { ...messageData, id };
  },

  robotext(messageInfo, creator, params) {
    return (
      `${creator} left ` +
      params.encodedThreadEntity(messageInfo.threadID, 'this thread')
    );
  },

  notificationTexts(messageInfos, threadInfo, params) {
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

  notificationCollapseKey(rawMessageInfo) {
    return joinResult(rawMessageInfo.type, rawMessageInfo.threadID);
  },

  generatesNotifs: false,
});
