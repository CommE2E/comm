// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import { useDispatchActionPromise } from './redux-promise-utils.js';
import { useSelector } from './redux-utils.js';
import {
  sendDeleteMessageActionTypes,
  useSendDeleteMessage,
} from '../actions/message-actions.js';
import {
  type OutboundDMOperationSpecification,
  dmOperationSpecificationTypes,
} from '../shared/dm-ops/dm-op-utils.js';
import { useProcessAndSendDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import type { DMSendDeleteMessageOperation } from '../types/dm-ops.js';
import type { MessageInfo, RawMessageInfo } from '../types/message-types.js';
import { thickThreadTypes } from '../types/thread-types-enum.js';

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
      if (threadInfo.thick) {
        invariant(viewerID, 'viewerID should be set');
        const op: DMSendDeleteMessageOperation = {
          type: 'send_delete_message',
          threadID: threadInfo.id,
          creatorID: viewerID,
          time: Date.now(),
          messageID: uuid.v4(),
          targetMessageID: messageID,
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
        const deleteMessagePromise = (async () => {
          const result = await callDeleteMessage({
            targetMessageID: messageID,
          });

          return ({
            newMessageInfos: result.newMessageInfos,
          }: { +newMessageInfos: $ReadOnlyArray<RawMessageInfo> });
        })();

        void dispatchActionPromise(
          sendDeleteMessageActionTypes,
          deleteMessagePromise,
        );
      }
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

export { useDeleteMessage };
