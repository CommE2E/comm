// @flow

import * as React from 'react';

import { threadHasPermission, threadIsPending } from './thread-utils.js';
import {
  sendEditMessageActionTypes,
  useSendEditMessage,
} from '../actions/message-actions.js';
import type {
  ComposableMessageInfo,
  RawMessageInfo,
  RobotextMessageInfo,
  SendEditMessageResult,
} from '../types/message-types';
import { messageTypes } from '../types/message-types-enum.js';
import type { MinimallyEncodedThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import type { LegacyThreadInfo } from '../types/thread-types.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function useEditMessage(): (
  messageID: string,
  newText: string,
) => Promise<SendEditMessageResult> {
  const callEditMessage = useSendEditMessage();
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    (messageID, newText) => {
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

      return editMessagePromise;
    },
    [dispatchActionPromise, callEditMessage],
  );
}

function useCanEditMessage(
  threadInfo: LegacyThreadInfo | MinimallyEncodedThreadInfo,
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

function getMessageLabel(hasBeenEdited: ?boolean, threadID: string): ?string {
  const isPending = threadIsPending(threadID);
  if (hasBeenEdited && !isPending) {
    return 'Edited';
  }
  return null;
}

export { useCanEditMessage, useEditMessage, getMessageLabel };
