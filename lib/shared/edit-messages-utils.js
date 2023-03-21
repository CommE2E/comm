// @flow

import * as React from 'react';

import { threadHasPermission } from './thread-utils.js';
import {
  sendEditMessageActionTypes,
  sendEditMessage,
} from '../actions/message-actions.js';
import { messageTypes } from '../types/message-types.js';
import type {
  RobotextMessageInfo,
  ComposableMessageInfo,
} from '../types/message-types.js';
import { threadPermissions, type ThreadInfo } from '../types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from '../utils/action-utils.js';
import { cloneError } from '../utils/errors.js';
import { useSelector } from '../utils/redux-utils.js';

function useEditMessage(messageID?: string): (newText: string) => mixed {
  const callEditMessage = useServerCall(sendEditMessage);
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    newText => {
      if (!messageID) {
        return;
      }

      const editMessagePromise = (async () => {
        try {
          const result = await callEditMessage({
            targetMessageID: messageID,
            text: newText,
          });
          return {
            newMessageInfos: result.newMessageInfos,
          };
        } catch (e) {
          throw cloneError(e);
        }
      })();

      dispatchActionPromise(sendEditMessageActionTypes, editMessagePromise);
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

export { useCanEditMessage, useEditMessage };
