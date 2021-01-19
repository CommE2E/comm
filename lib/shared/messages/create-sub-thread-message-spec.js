// @flow

import { permissionLookup } from '../../permissions/thread-permissions';
import { messageTypes } from '../../types/message-types';
import type {
  CreateSubthreadMessageData,
  CreateSubthreadMessageInfo,
  RawCreateSubthreadMessageInfo,
} from '../../types/message/create-subthread';
import { threadPermissions } from '../../types/thread-types';
import type { MessageSpec } from './message-spec';

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
});
