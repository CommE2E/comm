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
  JoinThreadMessageData,
  JoinThreadMessageInfo,
  RawJoinThreadMessageInfo,
} from '../../types/messages/join-thread.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { ThreadInfo } from '../../types/thread-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import {
  ET,
  type EntityText,
  pluralizeEntityText,
} from '../../utils/entity-text.js';
import { values } from '../../utils/objects.js';

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
    return ET`${creator} joined ${ET.thread({
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
    const joinerArray = {};
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

  generatesNotifs: async () => undefined,
});
