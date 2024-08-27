// @flow

import * as React from 'react';

import { threadIsPending, useThreadHasPermission } from './thread-utils.js';
import {
  sendEditMessageActionTypes,
  useSendEditMessage,
} from '../actions/message-actions.js';
import type {
  ComposableMessageInfo,
  RawMessageInfo,
  RobotextMessageInfo,
} from '../types/message-types';
import { messageTypes } from '../types/message-types-enum.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function useEditMessage(): (
  messageID: string,
  newText: string,
) => Promise<void> {
  const callEditMessage = useSendEditMessage();
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    async (messageID, newText) => {
      const editMessagePromise = (async () => {
        const result = await callEditMessage({
          targetMessageID: messageID,
          text: newText,
        });

        return ({
          newMessageInfos: result.newMessageInfos,
        }: { +newMessageInfos: $ReadOnlyArray<RawMessageInfo> });
      })();

      void dispatchActionPromise(
        sendEditMessageActionTypes,
        editMessagePromise,
      );

      await editMessagePromise;
    },
    [dispatchActionPromise, callEditMessage],
  );
}

function useCanEditMessage(
  threadInfo: ThreadInfo,
  targetMessageInfo: ComposableMessageInfo | RobotextMessageInfo,
): boolean {
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const currentUserCanEditMessage = useThreadHasPermission(
    threadInfo,
    threadPermissions.EDIT_MESSAGE,
  );
  if (!currentUserCanEditMessage) {
    return false;
  }

  if (targetMessageInfo.type !== messageTypes.TEXT) {
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
