// @flow

import invariant from 'invariant';

import type { PlatformDetails } from '../../types/device-types';
import { messageTypes } from '../../types/message-types';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types';
import type {
  CreateSidebarMessageData,
  CreateSidebarMessageInfo,
  RawCreateSidebarMessageInfo,
} from '../../types/messages/create-sidebar';
import type { RawUnsupportedMessageInfo } from '../../types/messages/unsupported';
import type { NotifTexts } from '../../types/notif-types';
import type { ThreadInfo } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import {
  ET,
  type EntityText,
  pluralizeEntityText,
} from '../../utils/entity-text';
import { stringForUser } from '../user-utils';
import { hasMinCodeVersion } from '../version-utils';
import {
  pushTypes,
  type CreateMessageInfoParams,
  type MessageSpec,
} from './message-spec';
import { assertSingleMessageInfo } from './utils';

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
    // TODO determine min code version
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

  notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
  ): NotifTexts {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.CREATE_SIDEBAR,
      'messageInfo should be messageTypes.CREATE_SIDEBAR!',
    );
    const prefix = stringForUser(messageInfo.creator);
    const title = threadInfo.uiName;
    const sourceMessageAuthorPossessive = messageInfo.sourceMessageAuthor
      .isViewer
      ? 'your'
      : `${stringForUser(messageInfo.sourceMessageAuthor)}'s`;
    const body =
      `started a thread in response to ${sourceMessageAuthorPossessive} ` +
      `message "${messageInfo.initialThreadState.name ?? ''}"`;
    const merged = `${prefix} ${body}`;
    return {
      merged,
      body,
      title,
      prefix,
    };
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
