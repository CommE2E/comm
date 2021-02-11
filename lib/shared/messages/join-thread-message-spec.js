// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  JoinThreadMessageData,
  JoinThreadMessageInfo,
  RawJoinThreadMessageInfo,
} from '../../types/messages/join-thread';
import { values } from '../../utils/objects';
import { pluralize } from '../../utils/text-utils';
import {
  robotextToRawString,
  robotextForMessageInfo,
  removeCreatorAsViewer,
} from '../message-utils';
import { stringForUser } from '../user-utils';
import type { MessageSpec } from './message-spec';
import { joinResult } from './utils';

export const joinThreadMessageSpec: MessageSpec<
  JoinThreadMessageData,
  RawJoinThreadMessageInfo,
  JoinThreadMessageInfo,
> = Object.freeze({
  rawMessageInfoFromRow(row) {
    return {
      type: messageTypes.JOIN_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
    };
  },

  messageTitle({ messageInfo, threadInfo, viewerContext }) {
    let validMessageInfo: JoinThreadMessageInfo = (messageInfo: JoinThreadMessageInfo);
    if (viewerContext === 'global') {
      validMessageInfo = removeCreatorAsViewer(validMessageInfo);
    }
    return robotextToRawString(
      robotextForMessageInfo(validMessageInfo, threadInfo),
    );
  },

  createMessageInfo(rawMessageInfo, creator) {
    return {
      type: messageTypes.JOIN_THREAD,
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
      `${creator} joined ` +
      params.encodedThreadEntity(messageInfo.threadID, 'this thread')
    );
  },

  notificationTexts(messageInfos, threadInfo, params) {
    const joinerArray = {};
    for (const messageInfo of messageInfos) {
      invariant(
        messageInfo.type === messageTypes.JOIN_THREAD,
        'messageInfo should be messageTypes.JOIN_THREAD!',
      );
      joinerArray[messageInfo.creator.id] = messageInfo.creator;
    }
    const joiners = values(joinerArray);
    const joinersString = pluralize(joiners.map(stringForUser));

    const body = `${joinersString} joined`;
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
