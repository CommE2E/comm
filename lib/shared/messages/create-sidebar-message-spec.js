// @flow

import { messageTypes } from '../../types/message-types';
import type {
  CreateSidebarMessageData,
  CreateSidebarMessageInfo,
  RawCreateSidebarMessageInfo,
} from '../../types/message/create-sidebar';
import type { MessageSpec } from './message-spec';

export const createSidebarMessageSpec: MessageSpec<
  CreateSidebarMessageData,
  RawCreateSidebarMessageInfo,
  CreateSidebarMessageInfo,
> = Object.freeze({
  messageContent(data) {
    return JSON.stringify({
      ...data.initialThreadState,
      sourceMessageAuthorID: data.sourceMessageAuthorID,
    });
  },

  rawMessageInfoFromRow(row) {
    const { sourceMessageAuthorID, ...initialThreadState } = JSON.parse(
      row.content,
    );
    return {
      type: messageTypes.CREATE_SIDEBAR,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      sourceMessageAuthorID,
      initialThreadState,
    };
  },

  createMessageInfo(rawMessageInfo, creator, params) {
    const { threadInfos } = params;
    const parentThreadInfo =
      threadInfos[rawMessageInfo.initialThreadState.parentThreadID];

    const sourceMessageAuthor = params.createRelativeUserInfos([
      rawMessageInfo.sourceMessageAuthorID,
    ])[0];
    if (!sourceMessageAuthor) {
      return null;
    }

    return {
      type: messageTypes.CREATE_SIDEBAR,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      sourceMessageAuthor,
      initialThreadState: {
        name: rawMessageInfo.initialThreadState.name,
        parentThreadInfo,
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
    let text = `started ${params.encodedThreadEntity(
      messageInfo.threadID,
      `this sidebar`,
    )}`;
    const users = messageInfo.initialThreadState.otherMembers.filter(
      (member) => member.id !== messageInfo.sourceMessageAuthor.id,
    );
    if (users.length !== 0) {
      const initialUsersString = params.robotextForUsers(users);
      text += ` and added ${initialUsersString}`;
    }
    return `${creator} ${text}`;
  },
});
