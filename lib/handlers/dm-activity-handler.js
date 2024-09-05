// @flow
import * as React from 'react';

import type { OutboundDMOperationSpecification } from '../shared/dm-ops/dm-op-utils';
import { dmOperationSpecificationTypes } from '../shared/dm-ops/dm-op-utils.js';
import { useProcessAndSendDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import { getMostRecentNonLocalMessageID } from '../shared/message-utils.js';
import { threadIsPending } from '../shared/thread-utils.js';
import type { DMChangeThreadReadStatusOperation } from '../types/dm-ops.js';
import { threadTypeIsThick } from '../types/thread-types-enum.js';
import { useSelector } from '../utils/redux-utils.js';

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

    void processAndSendDMOperation(opSpecification);
  }, [
    activeThread,
    viewerID,
    processAndSendDMOperation,
    activeThreadInfo,
    activeThreadLatestMessage,
  ]);
}

export default useDMActivityHandler;
