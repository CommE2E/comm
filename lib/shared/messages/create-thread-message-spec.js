// @flow

import invariant from 'invariant';

import { messageTypes } from '../../types/message-types';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types';
import type {
  CreateThreadMessageData,
  CreateThreadMessageInfo,
  RawCreateThreadMessageInfo,
} from '../../types/messages/create-thread';
import type { NotifTexts } from '../../types/notif-types';
import type { ThreadInfo } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import {
  robotextToRawString,
  robotextForMessageInfo,
  removeCreatorAsViewer,
} from '../message-utils';
import { stringForUser } from '../user-utils';
import type {
  CreateMessageInfoParams,
  MessageSpec,
  MessageTitleParam,
  NotificationTextsParams,
  RobotextParams,
} from './message-spec';
import { assertSingleMessageInfo } from './utils';

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

  messageTitle({
    messageInfo,
    threadInfo,
    viewerContext,
  }: MessageTitleParam<CreateThreadMessageInfo>) {
    let validMessageInfo: CreateThreadMessageInfo = (messageInfo: CreateThreadMessageInfo);
    if (viewerContext === 'global_viewer') {
      validMessageInfo = removeCreatorAsViewer(validMessageInfo);
      validMessageInfo = {
        ...validMessageInfo,
        initialThreadState: {
          ...validMessageInfo.initialThreadState,
          otherMembers: validMessageInfo.initialThreadState.otherMembers.map(
            item => ({
              ...item,
              isViewer: false,
            }),
          ),
        },
      };
    }
    return robotextToRawString(
      robotextForMessageInfo(validMessageInfo, threadInfo),
    );
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
      'content must be defined',
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
    creator: string,
    params: RobotextParams,
  ): string {
    let text = `created ${params.encodedThreadEntity(
      messageInfo.threadID,
      `this chat`,
    )}`;
    const parentThread = messageInfo.initialThreadState.parentThreadInfo;
    if (parentThread) {
      text +=
        ' as a child of ' +
        `<${encodeURI(parentThread.uiName)}|t${parentThread.id}>`;
    }
    if (messageInfo.initialThreadState.name) {
      text += ` with the name "${encodeURI(
        messageInfo.initialThreadState.name,
      )}"`;
    }
    const users = messageInfo.initialThreadState.otherMembers;
    if (users.length !== 0) {
      const initialUsersString = params.robotextForUsers(users);
      text += ` and added ${initialUsersString}`;
    }
    return `${creator} ${text}`;
  },

  notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
    params: NotificationTextsParams,
  ): NotifTexts {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.CREATE_THREAD,
      'messageInfo should be messageTypes.CREATE_THREAD!',
    );
    const parentThreadInfo = messageInfo.initialThreadState.parentThreadInfo;
    if (parentThreadInfo) {
      return params.notifTextForSubthreadCreation(
        messageInfo.creator,
        messageInfo.initialThreadState.type,
        parentThreadInfo,
        messageInfo.initialThreadState.name,
        threadInfo.uiName,
      );
    }
    const prefix = stringForUser(messageInfo.creator);
    const body = 'created a new chat';
    let merged = `${prefix} ${body}`;
    if (messageInfo.initialThreadState.name) {
      merged += ` called "${messageInfo.initialThreadState.name}"`;
    }
    return {
      merged,
      body,
      title: threadInfo.uiName,
      prefix,
    };
  },

  generatesNotifs: async () => true,

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
