// @flow
import invariant from 'invariant';
import * as React from 'react';

import { updateActivityActionTypes } from '../actions/activity-actions.js';
import type { OutboundDMOperationSpecification } from '../shared/dm-ops/dm-op-utils';
import { dmOperationSpecificationTypes } from '../shared/dm-ops/dm-op-utils.js';
import { useProcessAndSendDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import { getMostRecentNonLocalMessageID } from '../shared/message-utils.js';
import { threadIsPending } from '../shared/thread-utils.js';
import type { ActivityUpdateSuccessPayload } from '../types/activity-types.js';
import type { DMChangeThreadReadStatusOperation } from '../types/dm-ops.js';
import type { RawThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadTypeIsThick } from '../types/thread-types-enum.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function useUpdateDMActivity(): (
  viewerID: string,
  activeThreadInfo: RawThreadInfo,
) => Promise<ActivityUpdateSuccessPayload> {
  const processAndSendDMOperation = useProcessAndSendDMOperation();
  return React.useCallback(
    async (viewerID: string, activeThreadInfo: RawThreadInfo) => {
      invariant(
        threadTypeIsThick(activeThreadInfo.type),
        'thread must be thick',
      );
      const op: DMChangeThreadReadStatusOperation = {
        type: 'change_thread_read_status',
        time: Date.now(),
        threadID: activeThreadInfo.id,
        creatorID: viewerID,
        unread: false,
      };

      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: { type: 'self_devices' },
      };

      await processAndSendDMOperation(opSpecification);
      return { activityUpdates: {}, result: { unfocusedToUnread: [] } };
    },
    [processAndSendDMOperation],
  );
}

function useDMActivityHandler(activeThread: ?string): void {
  const activeThreadInfo = useSelector(state =>
    activeThread ? state.threadStore.threadInfos[activeThread] : null,
  );
  const activeThreadLatestMessage = useSelector(state =>
    activeThread
      ? getMostRecentNonLocalMessageID(activeThread, state.messageStore)
      : null,
  );
  const processAndSendDMOperation = useProcessAndSendDMOperation();

  const prevActiveThreadRef = React.useRef<?string>();
  const prevActiveThreadLatestMessageRef = React.useRef<?string>();

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const updateDMActivity = useUpdateDMActivity();
  const dispatchActionPromise = useDispatchActionPromise();

  React.useEffect(() => {
    const prevActiveThread = prevActiveThreadRef.current;
    const prevActiveThreadLatestMessage =
      prevActiveThreadLatestMessageRef.current;

    prevActiveThreadRef.current = activeThread;
    prevActiveThreadLatestMessageRef.current = activeThreadLatestMessage;

    if (
      !viewerID ||
      !activeThread ||
      !activeThreadInfo ||
      !threadTypeIsThick(activeThreadInfo.type) ||
      threadIsPending(activeThread) ||
      (activeThread === prevActiveThread &&
        activeThreadLatestMessage === prevActiveThreadLatestMessage)
    ) {
      return;
    }

    void dispatchActionPromise(
      updateActivityActionTypes,
      updateDMActivity(viewerID, activeThreadInfo),
    );
  }, [
    updateDMActivity,
    dispatchActionPromise,
    activeThread,
    viewerID,
    processAndSendDMOperation,
    activeThreadInfo,
    activeThreadLatestMessage,
  ]);
}

export default useDMActivityHandler;
