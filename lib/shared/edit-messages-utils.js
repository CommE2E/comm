// @flow

import * as React from 'react';

import { useProcessAndSendDMOperation } from './dm-ops/process-dm-ops.js';
import { threadIsPending, useThreadHasPermission } from './thread-utils.js';
import { threadSpecs } from './threads/thread-specs.js';
import { useSendEditMessage } from '../hooks/message-hooks.js';
import type {
  ComposableMessageInfo,
  RobotextMessageInfo,
} from '../types/message-types';
import { messageTypes } from '../types/message-types-enum.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function useEditMessage(
  threadInfo: ThreadInfo,
): (messageID: string, newText: string) => Promise<void> {
  const callEditMessage = useSendEditMessage();
  const dispatchActionPromise = useDispatchActionPromise();
  const processAndSendDMOperation = useProcessAndSendDMOperation();
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  return React.useCallback(
    (messageID, newText) =>
      threadSpecs[threadInfo.type].protocol.editTextMessage(
        { threadInfo, messageID, newText, viewerID },
        {
          keyserverEditMessage: callEditMessage,
          dispatchActionPromise,
          processAndSendDMOperation,
        },
      ),
    [
      callEditMessage,
      dispatchActionPromise,
      processAndSendDMOperation,
      threadInfo,
      viewerID,
    ],
  );
}

function useCanEditMessage(
  threadInfo: ThreadInfo,
  targetMessageInfo: ?ComposableMessageInfo | RobotextMessageInfo,
): boolean {
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const currentUserCanEditMessage = useThreadHasPermission(
    threadInfo,
    threadPermissions.EDIT_MESSAGE,
  );
  if (!currentUserCanEditMessage) {
    return false;
  }

  if (
    !targetMessageInfo ||
    !targetMessageInfo.id ||
    targetMessageInfo.type !== messageTypes.TEXT
  ) {
    return false;
  }

  if (!currentUserInfo || !currentUserInfo.id) {
    return false;
  }

  const currentUserId = currentUserInfo.id;
  const targetMessageCreatorId = targetMessageInfo.creator.id;

  return currentUserId === targetMessageCreatorId;
}

function getMessageLabel(hasBeenEdited: ?boolean, threadID: string): ?string {
  const isPending = threadIsPending(threadID);
  if (hasBeenEdited && !isPending) {
    return 'Edited';
  }
  return null;
}

export { useCanEditMessage, useEditMessage, getMessageLabel };
