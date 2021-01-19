// @flow

import { permissionLookup } from '../../permissions/thread-permissions';
import { messageTypes } from '../../types/message-types';
import type {
  CreateSubthreadMessageData,
  RawCreateSubthreadMessageInfo,
} from '../../types/message/create-subthread';
import { threadPermissions } from '../../types/thread-types';
import type { MessageSpec } from './message-spec';

export const createSubThreadMessageSpec: MessageSpec<
  CreateSubthreadMessageData,
  RawCreateSubthreadMessageInfo,
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
});
