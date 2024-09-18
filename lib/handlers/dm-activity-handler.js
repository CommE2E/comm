// @flow

import invariant from 'invariant';
import _debounce from 'lodash/debounce.js';
import * as React from 'react';

import {
  type OutboundDMOperationSpecification,
  dmOperationSpecificationTypes,
} from '../shared/dm-ops/dm-op-utils.js';
import { useProcessAndSendDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import { getMostRecentNonLocalMessageID } from '../shared/message-utils.js';
import { threadIsPending } from '../shared/thread-utils.js';
import type { DMChangeThreadReadStatusOperation } from '../types/dm-ops.js';
import type { RawThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadTypeIsThick } from '../types/thread-types-enum.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

const ACTIVITY_UPDATE_DURATION = 5000;

function useUpdateDMActivity(): (
  viewerID: string,
  activeThreadInfo: RawThreadInfo,
) => Promise<void> {
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

  const updateActivityAfterLatestMessageChange = React.useRef<?((() => void) & {
    cancel: () => void,
    flush: () => mixed,
    ...
  })>(null);

  React.useEffect(() => {
    const prevActiveThread = prevActiveThreadRef.current;
    const prevActiveThreadLatestMessage =
      prevActiveThreadLatestMessageRef.current;

    prevActiveThreadRef.current = activeThread;
    prevActiveThreadLatestMessageRef.current = activeThreadLatestMessage;

    const activeThreadChanged = prevActiveThread !== activeThread;

    if (activeThreadChanged) {
      updateActivityAfterLatestMessageChange.current?.flush();
    }

    if (
      !viewerID ||
      !activeThread ||
      !activeThreadInfo ||
      !threadTypeIsThick(activeThreadInfo.type) ||
      threadIsPending(activeThread)
    ) {
      return;
    }

    if (activeThreadInfo.currentUser.unread) {
      updateActivityAfterLatestMessageChange.current?.cancel();
      void updateDMActivity(viewerID, activeThreadInfo);
      return;
    }

    if (
      activeThreadChanged ||
      activeThreadLatestMessage === prevActiveThreadLatestMessage
    ) {
      return;
    }

    updateActivityAfterLatestMessageChange.current?.cancel();
    updateActivityAfterLatestMessageChange.current = _debounce(() => {
      void updateDMActivity(viewerID, activeThreadInfo);
      updateActivityAfterLatestMessageChange.current = null;
    }, ACTIVITY_UPDATE_DURATION);
    updateActivityAfterLatestMessageChange.current?.();
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
