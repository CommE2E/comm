// @flow

import invariant from 'invariant';

import { permissionLookup } from '../../permissions/thread-permissions';
import { messageTypes } from '../../types/message-types';
import type { MessageInfo } from '../../types/message-types';
import type {
  CreateSubthreadMessageData,
  CreateSubthreadMessageInfo,
  RawCreateSubthreadMessageInfo,
} from '../../types/messages/create-subthread';
import type { NotifTexts } from '../../types/notif-types';
import { threadPermissions, threadTypes } from '../../types/thread-types';
import type { ThreadInfo } from '../../types/thread-types';
import type { RelativeUserInfo } from '../../types/user-types';
import {
  robotextToRawString,
  robotextForMessageInfo,
  removeCreatorAsViewer,
} from '../message-utils';
import type {
  CreateMessageInfoParams,
  MessageSpec,
  MessageTitleParam,
  NotificationTextsParams,
} from './message-spec';
import { assertSingleMessageInfo } from './utils';

export const createSubThreadMessageSpec: MessageSpec<
  CreateSubthreadMessageData,
  RawCreateSubthreadMessageInfo,
  CreateSubthreadMessageInfo,
> = Object.freeze({
  messageContent(data: CreateSubthreadMessageData): string {
    return data.childThreadID;
  },

  messageTitle({
    messageInfo,
    threadInfo,
    viewerContext,
  }: MessageTitleParam<CreateSubthreadMessageInfo>) {
    let validMessageInfo: CreateSubthreadMessageInfo = (messageInfo: CreateSubthreadMessageInfo);
    if (viewerContext === 'global_viewer') {
      validMessageInfo = removeCreatorAsViewer(validMessageInfo);
    }
    return robotextToRawString(
      robotextForMessageInfo(validMessageInfo, threadInfo),
    );
  },

  rawMessageInfoFromRow(row: Object): ?RawCreateSubthreadMessageInfo {
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

  robotext(messageInfo: CreateSubthreadMessageInfo, creator: string): string {
    const childName = messageInfo.childThreadInfo.name;
    const childNoun =
      messageInfo.childThreadInfo.type === threadTypes.SIDEBAR
        ? 'sidebar'
        : 'child thread';
    if (childName) {
      return (
        `${creator} created a ${childNoun}` +
        ` named "<${encodeURI(childName)}|t${messageInfo.childThreadInfo.id}>"`
      );
    } else {
      return (
        `${creator} created a ` +
        `<${childNoun}|t${messageInfo.childThreadInfo.id}>`
      );
    }
  },

  notificationTexts(
    messageInfos: $ReadOnlyArray<MessageInfo>,
    threadInfo: ThreadInfo,
    params: NotificationTextsParams,
  ): NotifTexts {
    const messageInfo = assertSingleMessageInfo(messageInfos);
    invariant(
      messageInfo.type === messageTypes.CREATE_SUB_THREAD,
      'messageInfo should be messageTypes.CREATE_SUB_THREAD!',
    );
    return params.notifTextForSubthreadCreation(
      messageInfo.creator,
      messageInfo.childThreadInfo.type,
      threadInfo,
      messageInfo.childThreadInfo.name,
      messageInfo.childThreadInfo.uiName,
    );
  },

  generatesNotifs: true,

  threadIDs(
    rawMessageInfo: RawCreateSubthreadMessageInfo,
  ): $ReadOnlyArray<string> {
    return [rawMessageInfo.childThreadID];
  },
});
