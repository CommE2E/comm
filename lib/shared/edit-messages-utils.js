// @flow

import invariant from 'invariant';
import * as React from 'react';

import { threadIsPending, threadHasPermission } from './thread-utils.js';
import {
  sendEditMessageActionTypes,
  sendEditMessage,
} from '../actions/message-actions.js';
import type {
  SendEditMessageResult,
  RobotextMessageInfo,
  ComposableMessageInfo,
} from '../types/message-types';
import { messageTypes } from '../types/message-types-enum.js';
import { threadPermissions, type ThreadInfo } from '../types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from '../utils/action-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function useEditMessage(
  messageID?: string,
): (newText: string) => Promise<SendEditMessageResult> {
  const callEditMessage = useServerCall(sendEditMessage);
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    newText => {
      invariant(messageID, 'messageID should be set!');

      const editMessagePromise = (async () => {
        const result = await callEditMessage({
          targetMessageID: messageID,
          text: newText,
        });
        return {
          newMessageInfos: result.newMessageInfos,
        };
      })();

      dispatchActionPromise(sendEditMessageActionTypes, editMessagePromise);

      return editMessagePromise;
    },
    [messageID, dispatchActionPromise, callEditMessage],
  );
}

function useCanEditMessage(
  threadInfo: ThreadInfo,
  targetMessageInfo: ComposableMessageInfo | RobotextMessageInfo,
): boolean {
  const currentUserInfo = useSelector(state => state.currentUserInfo);

  if (targetMessageInfo.type !== messageTypes.TEXT) {
    return false;
  }

  if (!currentUserInfo || !currentUserInfo.id) {
    return false;
  }

  const currentUserId = currentUserInfo.id;
  const targetMessageCreatorId = targetMessageInfo.creator.id;
  if (currentUserId !== targetMessageCreatorId) {
    return false;
  }

  const hasPermission = threadHasPermission(
    threadInfo,
    threadPermissions.EDIT_MESSAGE,
  );
  return hasPermission;
}

function getMessageLabel(
  hasBeenEdited: ?boolean,
  threadInfo: ThreadInfo,
): ?string {
  const isPending = threadIsPending(threadInfo.id);
  if (hasBeenEdited && !isPending) {
    return 'Edited';
  }
  return null;
}

export { useCanEditMessage, useEditMessage, getMessageLabel };
