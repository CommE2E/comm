// @flow

import _debounce from 'lodash/debounce.js';
import * as React from 'react';

import {
  type OutboundDMOperationSpecification,
  dmOperationSpecificationTypes,
} from '../shared/dm-ops/dm-op-types.js';
import { useProcessAndSendDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import { getMostRecentNonLocalMessageID } from '../shared/message-utils.js';
import { threadIsPending } from '../shared/thread-utils.js';
import type { DMChangeThreadReadStatusOperation } from '../types/dm-ops.js';
import { threadTypeIsThick } from '../types/thread-types-enum.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

const ACTIVITY_UPDATE_DURATION = 5000;

function useUpdateDMActivity(): (
  viewerID: string,
  activeThread: string,
) => Promise<void> {
  const processAndSendDMOperation = useProcessAndSendDMOperation();
  return React.useCallback(
    async (viewerID: string, activeThread: string) => {
      const op: DMChangeThreadReadStatusOperation = {
        type: 'change_thread_read_status',
        time: Date.now(),
        threadID: activeThread,
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

function getUpateActivityAfterLatestMessageChange(
  viewerID: ?string,
  activeThread: ?string,
  updateDMActivity: (viewerID: string, activeThread: string) => Promise<void>,
) {
  return _debounce(() => {
    if (!activeThread || !viewerID) {
      return;
    }
    void updateDMActivity(viewerID, activeThread);
  }, ACTIVITY_UPDATE_DURATION);
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

  const updateActivityAfterLatestMessageChangeRef = React.useRef(
    getUpateActivityAfterLatestMessageChange(
      viewerID,
      activeThread,
      updateDMActivity,
    ),
  );

  React.useEffect(() => {
    const prevActiveThread = prevActiveThreadRef.current;
    const prevActiveThreadLatestMessage =
      prevActiveThreadLatestMessageRef.current;

    prevActiveThreadRef.current = activeThread;
    prevActiveThreadLatestMessageRef.current = activeThreadLatestMessage;

    const activeThreadChanged = prevActiveThread !== activeThread;
    if (activeThreadChanged) {
      updateActivityAfterLatestMessageChangeRef.current =
        getUpateActivityAfterLatestMessageChange(
          viewerID,
          activeThread,
          updateDMActivity,
        );
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
      void updateDMActivity(viewerID, activeThread);
      return;
    }

    if (
      activeThreadChanged ||
      activeThreadLatestMessage === prevActiveThreadLatestMessage
    ) {
      return;
    }

    updateActivityAfterLatestMessageChangeRef.current();
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
