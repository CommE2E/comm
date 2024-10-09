// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import {
  type OutboundDMOperationSpecification,
  dmOperationSpecificationTypes,
} from './dm-ops/dm-op-utils.js';
import { useProcessAndSendDMOperation } from './dm-ops/process-dm-ops.js';
import { threadIsPending, useThreadHasPermission } from './thread-utils.js';
import {
  sendEditMessageActionTypes,
  useSendEditMessage,
} from '../actions/message-actions.js';
import { type DMSendEditMessageOperation } from '../types/dm-ops.js';
import type {
  ComposableMessageInfo,
  RawMessageInfo,
  RobotextMessageInfo,
} from '../types/message-types';
import { messageTypes } from '../types/message-types-enum.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import {
  thickThreadTypes,
  threadTypeIsThick,
} from '../types/thread-types-enum.js';
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
    async (messageID, newText) => {
      if (threadTypeIsThick(threadInfo.type)) {
        invariant(viewerID, 'viewerID should be set');
        const op: DMSendEditMessageOperation = {
          type: 'send_edit_message',
          threadID: threadInfo.id,
          creatorID: viewerID,
          time: Date.now(),
          messageID: uuid.v4(),
          targetMessageID: messageID,
          text: newText,
        };
        const opSpecification: OutboundDMOperationSpecification = {
          type: dmOperationSpecificationTypes.OUTBOUND,
          op,
          recipients: {
            type: 'all_thread_members',
            threadID:
              threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
              threadInfo.parentThreadID
                ? threadInfo.parentThreadID
                : threadInfo.id,
          },
        };
        await processAndSendDMOperation(opSpecification);
      } else {
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
      }
    },
    [
      threadInfo.type,
      threadInfo.id,
      threadInfo.parentThreadID,
      viewerID,
      processAndSendDMOperation,
      dispatchActionPromise,
      callEditMessage,
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
