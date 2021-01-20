// @flow

import { messageTypes } from '../../types/message-types';
import type {
  CreateThreadMessageData,
  CreateThreadMessageInfo,
  RawCreateThreadMessageInfo,
} from '../../types/message/create-thread';
import type { MessageSpec } from './message-spec';

export const createThreadMessageSpec: MessageSpec<
  CreateThreadMessageData,
  RawCreateThreadMessageInfo,
  CreateThreadMessageInfo,
> = Object.freeze({
  messageContent(data) {
    return JSON.stringify(data.initialThreadState);
  },

  rawMessageInfoFromRow(row) {
    return {
      type: messageTypes.CREATE_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      initialThreadState: JSON.parse(row.content),
    };
  },

  createMessageInfo(rawMessageInfo, creator, params) {
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

  rawMessageInfoFromMessageData(messageData, id) {
    return { ...messageData, id };
  },

  robotext(messageInfo, creator, params) {
    let text = `created ${params.encodedThreadEntity(
      messageInfo.threadID,
      `this thread`,
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
});
