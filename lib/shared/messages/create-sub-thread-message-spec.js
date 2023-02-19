// @flow

import invariant from 'invariant';

import {
  pushTypes,
  type CreateMessageInfoParams,
  type MessageSpec,
  type GeneratesNotifsParams,
} from './message-spec.js';
import { assertSingleMessageInfo } from './utils.js';
import { permissionLookup } from '../../permissions/thread-permissions.js';
import { messageTypes } from '../../types/message-types.js';
import type {
  MessageInfo,
  ClientDBMessageInfo,
} from '../../types/message-types.js';
import type {
  CreateSubthreadMessageData,
  CreateSubthreadMessageInfo,
  RawCreateSubthreadMessageInfo,
} from '../../types/messages/create-subthread.js';
import type { NotifTexts } from '../../types/notif-types.js';
import { threadPermissions, threadTypes } from '../../types/thread-types.js';
import type { ThreadInfo } from '../../types/thread-types.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { ET, type EntityText } from '../../utils/entity-text.js';
import { notifTextsForSubthreadCreation } from '../notif-utils.js';

export const createSubThreadMessageSpec: MessageSpec<
  CreateSubthreadMessageData,
  RawCreateSubthreadMessageInfo,
  CreateSubthreadMessageInfo,
> = Object.freeze({
  messageContentForServerDB(
    data: CreateSubthreadMessageData | RawCreateSubthreadMessageInfo,
  ): string {
    return data.childThreadID;
  },

  messageContentForClientDB(data: RawCreateSubthreadMessageInfo): string {
    return this.messageContentForServerDB(data);
  },

  rawMessageInfoFromServerDBRow(row: Object): ?RawCreateSubthreadMessageInfo {
    const subthreadPermissions = row.subthread_permissions;
    if (!permissionLookup(subthreadPermissions, threadPermissions.KNOW_OF)) {
      return null;
    }
    return {
      type: messageTypes.CREATE_SUB_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      childThreadID: row.content,
    };
  },

  rawMessageInfoFromClientDB(
    clientDBMessageInfo: ClientDBMessageInfo,
  ): RawCreateSubthreadMessageInfo {
    const content = clientDBMessageInfo.content;
    invariant(
      content !== undefined && content !== null,
      'content must be defined',
    );
    const rawCreateSubthreadMessageInfo: RawCreateSubthreadMessageInfo = {
      type: messageTypes.CREATE_SUB_THREAD,
      id: clientDBMessageInfo.id,
      threadID: clientDBMessageInfo.thread,
      time: parseInt(clientDBMessageInfo.time),
      creatorID: clientDBMessageInfo.user,
      childThreadID: content,
    };
    return rawCreateSubthreadMessageInfo;
  },

  createMessageInfo(
    rawMessageInfo: RawCreateSubthreadMessageInfo,
    creator: RelativeUserInfo,
    params: CreateMessageInfoParams,
  ): ?CreateSubthreadMessageInfo {
    const { threadInfos } = params;
    const childThreadInfo = threadInfos[rawMessageInfo.childThreadID];
    if (!childThreadInfo) {
      return null;
    }
    return {
      type: messageTypes.CREATE_SUB_THREAD,
      id: rawMessageInfo.id,
      threadID: rawMessageInfo.threadID,
      creator,
      time: rawMessageInfo.time,
      childThreadInfo,
    };
  },

  rawMessageInfoFromMessageData(
    messageData: CreateSubthreadMessageData,
    id: ?string,
  ): RawCreateSubthreadMessageInfo {
    invariant(id, 'RawCreateSubthreadMessageInfo needs id');
    return { ...messageData, id };
  },

  robotext(messageInfo: CreateSubthreadMessageInfo): EntityText {
    const threadEntity = ET.thread({
      display: 'shortName',
      threadInfo: messageInfo.childThreadInfo,
      subchannel: true,
    });

    let text;
    if (messageInfo.childThreadInfo.name) {
      const childNoun =
        messageInfo.childThreadInfo.type === threadTypes.SIDEBAR
          ? 'thread'
          : 'subchannel';
      text = ET`created a ${childNoun} named "${threadEntity}"`;
    } else {
      text = ET`created a ${threadEntity}`;
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
      messageInfo.type === messageTypes.CREATE_SUB_THREAD,
      'messageInfo should be messageTypes.CREATE_SUB_THREAD!',
    );
    return notifTextsForSubthreadCreation({
      creator: messageInfo.creator,
      threadType: messageInfo.childThreadInfo.type,
      parentThreadInfo: threadInfo,
      childThreadName: messageInfo.childThreadInfo.name,
      childThreadUIName: messageInfo.childThreadInfo.uiName,
    });
  },

  generatesNotifs: async (
    rawMessageInfo: RawCreateSubthreadMessageInfo,
    messageData: CreateSubthreadMessageData,
    params: GeneratesNotifsParams,
  ) => {
    const { userNotMemberOfSubthreads } = params;
    return userNotMemberOfSubthreads.has(rawMessageInfo.childThreadID)
      ? pushTypes.NOTIF
      : undefined;
  },

  threadIDs(
    rawMessageInfo: RawCreateSubthreadMessageInfo,
  ): $ReadOnlyArray<string> {
    return [rawMessageInfo.childThreadID];
  },
});
