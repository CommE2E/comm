// @flow

import invariant from 'invariant';

import {
  pushTypes,
  type CreateMessageInfoParams,
  type MessageSpec,
} from './message-spec.js';
import { assertSingleMessageInfo } from './utils.js';
import { messageTypes } from '../../types/message-types.js';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types.js';
import type {
  CreateThreadMessageData,
  CreateThreadMessageInfo,
  RawCreateThreadMessageInfo,
} from '../../types/messages/create-thread.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { ThreadInfo } from '../../types/thread-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import {
  ET,
  type EntityText,
  pluralizeEntityText,
} from '../../utils/entity-text.js';
import { notifTextsForSubthreadCreation } from '../notif-utils.js';
import { threadNoun } from '../thread-utils.js';

export const createThreadMessageSpec: MessageSpec<
  CreateThreadMessageData,
  RawCreateThreadMessageInfo,
  CreateThreadMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data: CreateThreadMessageData | RawCreateThreadMessageInfo,
  ): string {
    return JSON.stringify(data.initialThreadState);
  },

  messageContentForClientDB(data: RawCreateThreadMessageInfo): string {
    return this.messageContentForServerDB(data);
  },

  rawMessageInfoFromServerDBRow(row: Object): RawCreateThreadMessageInfo {
    return {
      type: messageTypes.CREATE_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      initialThreadState: JSON.parse(row.content),
    };
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawCreateThreadMessageInfo {
    const content = clientDBMessageInfo.content;
    invariant(
      content !== undefined && content !== null,
      'content must be defined for CreateThread',
    );
    const rawCreateThreadMessageInfo: RawCreateThreadMessageInfo = {
      type: messageTypes.CREATE_THREAD,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      initialThreadState: JSON.parse(content),
    };
    return rawCreateThreadMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawCreateThreadMessageInfo,
    creator: RelativeUserInfo,
    params: CreateMessageInfoParams,
  ): CreateThreadMessageInfo {
    const initialParentThreadID =
      rawMessageInfo.initialThreadState.parentThreadID;
    const parentThreadInfo = initialParentThreadID
      ? params.threadInfos[initialParentThreadID]
      : null;

    return {
      type: messageTypes.CREATE_THREAD,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      initialThreadState: {
        name: rawMessageInfo.initialThreadState.name,
        parentThreadInfo,
        type: rawMessageInfo.initialThreadState.type,
        color: rawMessageInfo.initialThreadState.color,
        otherMembers: params.createRelativeUserInfos(
          rawMessageInfo.initialThreadState.memberIDs.filter(
            (userID: string) => userID !== rawMessageInfo.creatorID,
          ),
        ),
      },
    };
  },

  rawMessageInfoFromMessageData(
    messageData: CreateThreadMessageData,
    id: ?string,
  ): RawCreateThreadMessageInfo {
    invariant(id, 'RawCreateThreadMessageInfo needs id');
    return { ...messageData, id };
  },

  robotext(messageInfo: CreateThreadMessageInfo): EntityText {
    let text = ET`created ${ET.thread({
      display: 'alwaysDisplayShortName',
      threadID: messageInfo.threadID,
    })}`;
    const parentThread = messageInfo.initialThreadState.parentThreadInfo;
    if (parentThread) {
      text = ET`${text} as a child of ${ET.thread({
        display: 'uiName',
        threadInfo: parentThread,
      })}`;
    }
    if (messageInfo.initialThreadState.name) {
      text = ET`${text} with the name "${messageInfo.initialThreadState.name}"`;
    }
    const users = messageInfo.initialThreadState.otherMembers;
    if (users.length !== 0) {
      const initialUsers = pluralizeEntityText(
        users.map(user => ET`${ET.user({ userInfo: user })}`),
      );
      text = ET`${text} and added ${initialUsers}`;
    }
    const creator = ET.user({ userInfo: messageInfo.creator });
    return ET`${creator} ${text}`;
  },

  async notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): Promise<NotifTexts> {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.CREATE_THREAD,
      'messageInfo should be messageTypes.CREATE_THREAD!',
    );

    const threadType = messageInfo.initialThreadState.type;
    const parentThreadInfo = messageInfo.initialThreadState.parentThreadInfo;
    const threadName = messageInfo.initialThreadState.name;

    if (parentThreadInfo) {
      return notifTextsForSubthreadCreation({
        creator: messageInfo.creator,
        threadType,
        parentThreadInfo,
        childThreadName: threadName,
        childThreadUIName: threadInfo.uiName,
      });
    }

    const creator = ET.user({ userInfo: messageInfo.creator });
    const prefix = ET`${creator}`;

    const body = `created a new ${threadNoun(threadType)}`;
    let merged = ET`${prefix} ${body}`;
    if (threadName) {
      merged = ET`${merged} called "${threadName}"`;
    }

    return {
      merged,
      body,
      title: threadInfo.uiName,
      prefix,
    };
  },

  generatesNotifs: async () => pushTypes.NOTIF,

  userIDs(rawMessageInfo: RawCreateThreadMessageInfo): $ReadOnlyArray<string> {
    return rawMessageInfo.initialThreadState.memberIDs;
  },

  startsThread: true,

  threadIDs(
    rawMessageInfo: RawCreateThreadMessageInfo,
  ): $ReadOnlyArray<string> {
    const { parentThreadID } = rawMessageInfo.initialThreadState;
    return parentThreadID ? [parentThreadID] : [];
  },
});
