// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types';
import type {
  JoinThreadMessageData,
  JoinThreadMessageInfo,
  RawJoinThreadMessageInfo,
} from '../../types/messages/join-thread';
import type { NotifTexts } from '../../types/notif-types';
import type { ThreadInfo } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import {
  ET,
  type EntityText,
  pluralizeEntityText,
} from '../../utils/entity-text';
import { values } from '../../utils/objects';
import type { MessageSpec } from './message-spec';
import { joinResult } from './utils';

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

  robotext(messageInfo: JoinThreadMessageInfo): EntityText {
    const creator = ET.user({ userInfo: messageInfo.creator });
    return ET`${creator} joined ${ET.thread({
      display: 'alwaysDisplayShortName',
      threadID: messageInfo.threadID,
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
