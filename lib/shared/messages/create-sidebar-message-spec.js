// @flow

import invariant from 'invariant';

import {
  type CreateMessageInfoParams,
  type MessageSpec,
  type NotificationTextsParams,
  messageNotifyTypes,
  type RobotextParams,
} from './message-spec.js';
import { joinResult } from './utils.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type {
  ClientDBMessageInfo,
  MessageInfo,
} from '../../types/message-types.js';
import {
  type CreateSidebarMessageData,
  type CreateSidebarMessageInfo,
  type RawCreateSidebarMessageInfo,
  rawCreateSidebarMessageInfoValidator,
} from '../../types/messages/create-sidebar.js';
import type { ThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import {
  type EntityText,
  ET,
  pluralizeEntityText,
} from '../../utils/entity-text.js';
import { notifTextsForSidebarCreation } from '../notif-utils.js';

type CreateSidebarMessageSpec = MessageSpec<
  CreateSidebarMessageData,
  RawCreateSidebarMessageInfo,
  CreateSidebarMessageInfo,
> & {
  // We need to explicitly type this as non-optional so that
  // it can be referenced from messageContentForClientDB below
  +messageContentForServerDB: (
    data: CreateSidebarMessageData | RawCreateSidebarMessageInfo,
  ) => string,
  ...
};

export const createSidebarMessageSpec: CreateSidebarMessageSpec = Object.freeze(
  {
    messageContentForServerDB(
      data: CreateSidebarMessageData | RawCreateSidebarMessageInfo,
    ): string {
      return JSON.stringify({
        ...data.initialThreadState,
        sourceMessageAuthorID: data.sourceMessageAuthorID,
      });
    },

    messageContentForClientDB(data: RawCreateSidebarMessageInfo): string {
      return createSidebarMessageSpec.messageContentForServerDB(data);
    },

    rawMessageInfoFromServerDBRow(row: Object): RawCreateSidebarMessageInfo {
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

    rawMessageInfoFromClientDB(
      clientDBMessageInfo: ClientDBMessageInfo,
    ): RawCreateSidebarMessageInfo {
      invariant(
        clientDBMessageInfo.content !== undefined &&
          clientDBMessageInfo.content !== null,
        'content must be defined for CreateSidebar',
      );

      const { sourceMessageAuthorID, ...initialThreadState } = JSON.parse(
        clientDBMessageInfo.content,
      );
      const rawCreateSidebarMessageInfo: RawCreateSidebarMessageInfo = {
        type: messageTypes.CREATE_SIDEBAR,
        id: clientDBMessageInfo.id,
        threadID: clientDBMessageInfo.thread,
        time: parseInt(clientDBMessageInfo.time),
        creatorID: clientDBMessageInfo.user,
        sourceMessageAuthorID: sourceMessageAuthorID,
        initialThreadState: initialThreadState,
      };
      return rawCreateSidebarMessageInfo;
    },

    createMessageInfo(
      rawMessageInfo: RawCreateSidebarMessageInfo,
      creator: RelativeUserInfo,
      params: CreateMessageInfoParams,
    ): ?CreateSidebarMessageInfo {
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

    rawMessageInfoFromMessageData(
      messageData: CreateSidebarMessageData,
      id: ?string,
    ): RawCreateSidebarMessageInfo {
      invariant(id, 'RawCreateSidebarMessageInfo needs id');
      return { ...messageData, id };
    },

    robotext(
      messageInfo: CreateSidebarMessageInfo,
      params: RobotextParams,
    ): EntityText {
      let text = ET`started ${ET.thread({
        display: 'alwaysDisplayShortName',
        threadID: messageInfo.threadID,
        threadType: params.threadInfo?.type,
        parentThreadID: params.threadInfo?.parentThreadID,
      })}`;
      const users = messageInfo.initialThreadState.otherMembers.filter(
        member => member.id !== messageInfo.sourceMessageAuthor.id,
      );
      if (users.length !== 0) {
        const initialUsers = pluralizeEntityText(
          users.map(user => ET`${ET.user({ userInfo: user })}`),
        );
        text = ET`${text} and added ${initialUsers}`;
      }
      const creator = ET.user({ userInfo: messageInfo.creator });
      return ET`${creator} ${text}`;
    },

    unshimMessageInfo(
      unwrapped: RawCreateSidebarMessageInfo,
    ): RawCreateSidebarMessageInfo {
      return unwrapped;
    },

    async notificationTexts(
      messageInfos: $ReadOnlyArray<MessageInfo>,
      threadInfo: ThreadInfo,
      params: NotificationTextsParams,
    ): Promise<NotifTexts> {
      const createSidebarMessageInfo = messageInfos[0];
      invariant(
        createSidebarMessageInfo.type === messageTypes.CREATE_SIDEBAR,
        'first MessageInfo should be messageTypes.CREATE_SIDEBAR!',
      );

      let sidebarSourceMessageInfo;
      const secondMessageInfo = messageInfos[1];
      if (
        secondMessageInfo &&
        secondMessageInfo.type === messageTypes.SIDEBAR_SOURCE
      ) {
        sidebarSourceMessageInfo = secondMessageInfo;
      }

      return notifTextsForSidebarCreation({
        createSidebarMessageInfo,
        sidebarSourceMessageInfo,
        threadInfo,
        params,
      });
    },

    notificationCollapseKey(
      rawMessageInfo: RawCreateSidebarMessageInfo,
    ): string {
      return joinResult(messageTypes.CREATE_SIDEBAR, rawMessageInfo.threadID);
    },

    getMessageNotifyType: async () => messageNotifyTypes.NOTIF_AND_SET_UNREAD,

    userIDs(
      rawMessageInfo: RawCreateSidebarMessageInfo,
    ): $ReadOnlyArray<string> {
      return rawMessageInfo.initialThreadState.memberIDs;
    },

    threadIDs(
      rawMessageInfo: RawCreateSidebarMessageInfo,
    ): $ReadOnlyArray<string> {
      const { parentThreadID } = rawMessageInfo.initialThreadState;
      return [parentThreadID];
    },

    canBeSidebarSource: true,

    canBePinned: false,

    validator: rawCreateSidebarMessageInfoValidator,
  },
);
