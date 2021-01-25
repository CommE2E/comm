// @flow

import invariant from 'invariant';

import { permissionLookup } from '../../permissions/thread-permissions';
import { messageTypes } from '../../types/message-types';
import type {
  CreateSubthreadMessageData,
  CreateSubthreadMessageInfo,
  RawCreateSubthreadMessageInfo,
} from '../../types/message/create-subthread';
import { threadPermissions, threadTypes } from '../../types/thread-types';
import type { MessageSpec } from './message-spec';
import { assertSingleMessageInfo } from './utils';

export const createSubThreadMessageSpec: MessageSpec<
  CreateSubthreadMessageData,
  RawCreateSubthreadMessageInfo,
  CreateSubthreadMessageInfo,
> = Object.freeze({
  messageContent(data) {
    return data.childThreadID;
  },

  rawMessageInfoFromRow(row) {
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

  createMessageInfo(rawMessageInfo, creator, params) {
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

  rawMessageInfoFromMessageData(messageData, id) {
    return { ...messageData, id };
  },

  robotext(messageInfo, creator) {
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

  notificationTexts(messageInfos, threadInfo, params) {
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

  threadIDs(rawMessageInfo) {
    return [rawMessageInfo.childThreadID];
  },
});
