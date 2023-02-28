// @flow

import invariant from 'invariant';

import {
  pushTypes,
  type CreateMessageInfoParams,
  type MessageSpec,
  type NotificationTextsParams,
} from './message-spec.js';
import { joinResult } from './utils.js';
import type { PlatformDetails } from '../../types/device-types.js';
import { messageTypes } from '../../types/message-types.js';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types.js';
import type {
  CreateSidebarMessageData,
  CreateSidebarMessageInfo,
  RawCreateSidebarMessageInfo,
} from '../../types/messages/create-sidebar.js';
import type { RawUnsupportedMessageInfo } from '../../types/messages/unsupported.js';
import type { NotifTexts } from '../../types/notif-types.js';
import type { ThreadInfo } from '../../types/thread-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import {
  ET,
  type EntityText,
  pluralizeEntityText,
} from '../../utils/entity-text.js';
import { notifTextsForSidebarCreation } from '../notif-utils.js';
import { hasMinCodeVersion } from '../version-utils.js';

export const createSidebarMessageSpec: MessageSpec<
  CreateSidebarMessageData,
  RawCreateSidebarMessageInfo,
  CreateSidebarMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data: CreateSidebarMessageData | RawCreateSidebarMessageInfo,
  ): string {
    return JSON.stringify({
      ...data.initialThreadState,
      sourceMessageAuthorID: data.sourceMessageAuthorID,
    });
  },

  messageContentForClientDB(data: RawCreateSidebarMessageInfo): string {
    return this.messageContentForServerDB(data);
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
      'content must be defined',
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

  robotext(messageInfo: CreateSidebarMessageInfo): EntityText {
    let text = ET`started ${ET.thread({
      display: 'alwaysDisplayShortName',
      threadID: messageInfo.threadID,
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

  shimUnsupportedMessageInfo(
    rawMessageInfo: RawCreateSidebarMessageInfo,
    platformDetails: ?PlatformDetails,
  ): RawCreateSidebarMessageInfo | RawUnsupportedMessageInfo {
    if (hasMinCodeVersion(platformDetails, 75)) {
      return rawMessageInfo;
    }
    const { id } = rawMessageInfo;
    invariant(id !== null && id !== undefined, 'id should be set on server');
    return {
      type: messageTypes.UNSUPPORTED,
      id,
      threadID: rawMessageInfo.threadID,
      creatorID: rawMessageInfo.creatorID,
      time: rawMessageInfo.time,
      robotext: 'created a thread',
      unsupportedMessageInfo: rawMessageInfo,
    };
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

  notificationCollapseKey(rawMessageInfo: RawCreateSidebarMessageInfo): string {
    return joinResult(messageTypes.CREATE_SIDEBAR, rawMessageInfo.threadID);
  },

  generatesNotifs: async () => pushTypes.NOTIF,

  userIDs(rawMessageInfo: RawCreateSidebarMessageInfo): $ReadOnlyArray<string> {
    return rawMessageInfo.initialThreadState.memberIDs;
  },

  threadIDs(
    rawMessageInfo: RawCreateSidebarMessageInfo,
  ): $ReadOnlyArray<string> {
    const { parentThreadID } = rawMessageInfo.initialThreadState;
    return [parentThreadID];
  },
});
