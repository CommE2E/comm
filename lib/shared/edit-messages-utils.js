// @flow

import invariant from 'invariant';
import * as React from 'react';

import { threadHasPermission } from './thread-utils.js';
import {
  sendEditMessageActionTypes,
  sendEditMessage,
} from '../actions/message-actions.js';
import { messageInfoSelector } from '../selectors/chat-selectors.js';
import type {
  SendEditMessageResult,
  RobotextMessageInfo,
  ComposableMessageInfo,
  MessageInfo,
} from '../types/message-types';
import { messageTypes } from '../types/message-types.js';
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

function useGetEditedMessage(targetMessageID: ?string): () => ?MessageInfo {
  const messageInfos = useSelector(messageInfoSelector);
  const targetMessageInfo = targetMessageID && messageInfos[targetMessageID];
  const threadInfo = useSelector(state => {
    if (!targetMessageInfo) {
      return null;
    }
    return state.messageStore.threads[targetMessageInfo.threadID];
  });

  return React.useCallback(() => {
    if (!targetMessageInfo || targetMessageInfo.type !== messageTypes.TEXT) {
      return null;
    }
    const threadMessageInfos = (threadInfo?.messageIDs ?? [])
      .map((messageID: string) => messageInfos[messageID])
      .filter(Boolean)
      .filter(
        message =>
          message.type === messageTypes.EDIT_MESSAGE &&
          message.targetMessageID === targetMessageID,
      );
    if (threadMessageInfos.length === 0) {
      return targetMessageInfo;
    }
    invariant(
      threadMessageInfos[0].type === messageTypes.EDIT_MESSAGE,
      'message should be edit message',
    );
    return {
      ...targetMessageInfo,
      text: threadMessageInfos[0].text,
    };
  }, [messageInfos, targetMessageID, targetMessageInfo, threadInfo]);
}

export { useCanEditMessage, useGetEditedMessage, useEditMessage };
