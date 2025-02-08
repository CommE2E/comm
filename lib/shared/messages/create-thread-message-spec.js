// @flow

import invariant from 'invariant';

import {
  type CreateMessageInfoParams,
  type MessageSpec,
  messageNotifyTypes,
  type RobotextParams,
} from './message-spec.js';
import { assertSingleMessageInfo } from './utils.js';
import genesis from '../../facts/genesis.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type {
  ClientDBMessageInfo,
  MessageInfo,
} from '../../types/message-types.js';
import {
  type CreateThreadMessageData,
  type CreateThreadMessageInfo,
  type RawCreateThreadMessageInfo,
  rawCreateThreadMessageInfoValidator,
} from '../../types/messages/create-thread.js';
import type { ThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import {
  type EntityText,
  ET,
  pluralizeEntityText,
} from '../../utils/entity-text.js';
import { notifTextsForSubthreadCreation } from '../notif-utils.js';
import { threadNoun } from '../thread-utils.js';

type CreateThreadMessageSpec = MessageSpec<
  CreateThreadMessageData,
  RawCreateThreadMessageInfo,
  CreateThreadMessageInfo,
> & {
  // We need to explicitly type this as non-optional so that
  // it can be referenced from messageContentForClientDB below
  +messageContentForServerDB: (
    data: CreateThreadMessageData | RawCreateThreadMessageInfo,
  ) => string,
  ...
};

export const createThreadMessageSpec: CreateThreadMessageSpec = Object.freeze({
  messageContentForServerDB(
    data: CreateThreadMessageData | RawCreateThreadMessageInfo,
  ): string {
    return JSON.stringify(data.initialThreadState);
  },

  messageContentForClientDB(data: RawCreateThreadMessageInfo): string {
    return createThreadMessageSpec.messageContentForServerDB(data);
  },

  rawMessageInfoFromServerDBRow(row: Object): RawCreateThreadMessageInfo {
    const threadID = row.threadID.toString();
    let initialThreadState = JSON.parse(row.content);
    if (threadID === genesis().id) {
      initialThreadState = {
        ...initialThreadState,
        memberIDs: [],
      };
    }
    return {
      type: messageTypes.CREATE_THREAD,
      id: row.id.toString(),
      threadID,
      time: row.time,
      creatorID: row.creatorID.toString(),
      initialThreadState,
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

  robotext(
    messageInfo: CreateThreadMessageInfo,
    params: RobotextParams,
  ): EntityText {
    let text = ET`created ${ET.thread({
      display: 'alwaysDisplayShortName',
      threadID: messageInfo.threadID,
      threadType: params.threadInfo?.type,
      parentThreadID: params.threadInfo?.parentThreadID,
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

  getMessageNotifyType: async () => messageNotifyTypes.NOTIF_AND_SET_UNREAD,

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

  canBeSidebarSource: true,

  canBePinned: false,

  validator: rawCreateThreadMessageInfoValidator,
});
