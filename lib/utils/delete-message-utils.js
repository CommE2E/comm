// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useDispatchActionPromise } from './redux-promise-utils.js';
import { useSelector } from './redux-utils.js';
import { useSendDeleteMessage } from '../hooks/message-hooks.js';
import { useProcessAndSendDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import { useThreadHasPermission } from '../shared/thread-utils.js';
import { threadSpecs } from '../shared/threads/thread-specs.js';
import type { MessageInfo } from '../types/message-types.js';
import { isComposableMessageType } from '../types/message-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';

const deletedMessageText = 'Deleted message';

function useDeleteMessage(): (message: MessageInfo) => Promise<void> {
  const callDeleteMessage = useSendDeleteMessage();
  const dispatchActionPromise = useDispatchActionPromise();
  const processAndSendDMOperation = useProcessAndSendDMOperation();
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const threadInfos = useSelector(state => state.threadStore.threadInfos);

  return React.useCallback(
    async (message: MessageInfo) => {
      const messageID = message.id;
      invariant(messageID, 'Message ID should be set');
      const threadInfo = threadInfos[message.threadID];
      await threadSpecs[threadInfo.type].protocol.deleteMessage(
        { messageID, viewerID, threadInfo },
        {
          keyserverDeleteMessage: callDeleteMessage,
          dispatchActionPromise,
          processAndSendDMOperation,
        },
      );
    },
    [
      callDeleteMessage,
      dispatchActionPromise,
      processAndSendDMOperation,
      threadInfos,
      viewerID,
    ],
  );
}

function useCanDeleteMessage(
  threadInfo: ThreadInfo,
  targetMessageInfo: ?MessageInfo,
  threadCreatedFromMessage: boolean,
): boolean {
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const canDeleteOwnMessages = useThreadHasPermission(
    threadInfo,
    threadPermissions.DELETE_OWN_MESSAGES,
  );
  const canDeleteAllMessages = useThreadHasPermission(
    threadInfo,
    threadPermissions.DELETE_ALL_MESSAGES,
  );

  if (
    !targetMessageInfo ||
    !targetMessageInfo.id ||
    !isComposableMessageType(targetMessageInfo.type)
  ) {
    return false;
  }

  if (!currentUserInfo || !currentUserInfo.id) {
    return false;
  }

  if (
    !threadSpecs[threadInfo.type].protocol.allowsDeletingSidebarSource &&
    (targetMessageInfo.time < threadInfo.creationTime ||
      threadCreatedFromMessage)
  ) {
    // This code blocks deleting a sidebar source in thick threads - we
    // don't handle it correctly now. We have a task to track
    // https://linear.app/comm/issue/ENG-10528/handle-message-edit-and-delete-of-a-sidebar-source-in-thick-threads
    return false;
  }

  if (canDeleteAllMessages) {
    return true;
  }

  return (
    currentUserInfo.id === targetMessageInfo.creator.id && canDeleteOwnMessages
  );
}

export { useDeleteMessage, useCanDeleteMessage, deletedMessageText };
