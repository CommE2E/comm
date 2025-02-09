// @flow

import invariant from 'invariant';

import {
  type CreateMessageInfoParams,
  type GeneratesNotifsParams,
  type MessageSpec,
  messageNotifyTypes,
} from './message-spec.js';
import { assertSingleMessageInfo } from './utils.js';
import { permissionLookup } from '../../permissions/thread-permissions.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type {
  ClientDBMessageInfo,
  MessageInfo,
} from '../../types/message-types.js';
import {
  type CreateSubthreadMessageData,
  type CreateSubthreadMessageInfo,
  type RawCreateSubthreadMessageInfo,
  rawCreateSubthreadMessageInfoValidator,
} from '../../types/messages/create-subthread.js';
import type { ThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { NotifTexts } from '../../types/notif-types.js';
import { threadPermissions } from '../../types/thread-permission-types.js';
import { threadTypeIsSidebar } from '../../types/thread-types-enum.js';
import type { RelativeUserInfo } from '../../types/user-types.js';
import { type EntityText, ET } from '../../utils/entity-text.js';
import { notifTextsForSubthreadCreation } from '../notif-utils.js';

type CreateSubThreadMessageSpec = MessageSpec<
  CreateSubthreadMessageData,
  RawCreateSubthreadMessageInfo,
  CreateSubthreadMessageInfo,
> & {
  // We need to explicitly type this as non-optional so that
  // it can be referenced from messageContentForClientDB below
  +messageContentForServerDB: (
    data: CreateSubthreadMessageData | RawCreateSubthreadMessageInfo,
  ) => string,
  ...
};

export const createSubThreadMessageSpec: CreateSubThreadMessageSpec =
  Object.freeze({
    messageContentForServerDB(
      data: CreateSubthreadMessageData | RawCreateSubthreadMessageInfo,
    ): string {
      return data.childThreadID;
    },

    messageContentForClientDB(data: RawCreateSubthreadMessageInfo): string {
      return createSubThreadMessageSpec.messageContentForServerDB(data);
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
        'content must be defined for CreateSubThread',
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
        const childNoun = threadTypeIsSidebar(messageInfo.childThreadInfo.type)
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

    getMessageNotifyType: async (
      rawMessageInfo: RawCreateSubthreadMessageInfo,
      params: GeneratesNotifsParams,
    ) => {
      const { userNotMemberOfSubthreads } = params;
      return userNotMemberOfSubthreads.has(rawMessageInfo.childThreadID)
        ? messageNotifyTypes.NOTIF_AND_SET_UNREAD
        : messageNotifyTypes.SET_UNREAD;
    },

    threadIDs(
      rawMessageInfo: RawCreateSubthreadMessageInfo,
    ): $ReadOnlyArray<string> {
      return [rawMessageInfo.childThreadID];
    },

    canBeSidebarSource: true,

    canBePinned: false,

    validator: rawCreateSubthreadMessageInfoValidator,
  });
