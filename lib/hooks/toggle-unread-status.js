// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  setThreadUnreadStatusActionTypes,
  useSetThreadUnreadStatus,
} from '../actions/activity-actions.js';
import type { OutboundDMOperationSpecification } from '../shared/dm-ops/dm-op-utils';
import { dmOperationSpecificationTypes } from '../shared/dm-ops/dm-op-utils.js';
import { useProcessAndSendDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import type {
  SetThreadUnreadStatusPayload,
  SetThreadUnreadStatusRequest,
} from '../types/activity-types.js';
import type { DMChangeThreadReadStatusOperation } from '../types/dm-ops';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadTypeIsThick } from '../types/thread-types-enum.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function useToggleUnreadStatus(
  threadInfo: ThreadInfo,
  mostRecentNonLocalMessage: ?string,
  afterAction: () => void,
): () => void {
  const dispatchActionPromise = useDispatchActionPromise();
  const { currentUser } = threadInfo;
  const boundSetThreadUnreadStatus: (
    request: SetThreadUnreadStatusRequest,
  ) => Promise<SetThreadUnreadStatusPayload> = useSetThreadUnreadStatus();

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const processAndSendDMOperation = useProcessAndSendDMOperation();

  const toggleUnreadStatus = React.useCallback(() => {
    if (threadTypeIsThick(threadInfo.type)) {
      invariant(viewerID, 'viewerID must be set');
      const op: DMChangeThreadReadStatusOperation = {
        type: 'change_thread_read_status',
        time: Date.now(),
        threadID: threadInfo.id,
        creatorID: viewerID,
        unread: !currentUser.unread,
      };

      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'self_devices',
        },
      };

      void processAndSendDMOperation(opSpecification);
      afterAction();
      return;
    }

    const request = {
      threadID: threadInfo.id,
      unread: !currentUser.unread,
      latestMessage: mostRecentNonLocalMessage,
    };
    void dispatchActionPromise(
      setThreadUnreadStatusActionTypes,
      boundSetThreadUnreadStatus(request),
      undefined,
      ({
        threadID: threadInfo.id,
        unread: !currentUser.unread,
      }: { +threadID: string, +unread: boolean }),
    );
    afterAction();
  }, [
    processAndSendDMOperation,
    viewerID,
    threadInfo,
    currentUser.unread,
    mostRecentNonLocalMessage,
    dispatchActionPromise,
    afterAction,
    boundSetThreadUnreadStatus,
  ]);

  return toggleUnreadStatus;
}

export default useToggleUnreadStatus;
