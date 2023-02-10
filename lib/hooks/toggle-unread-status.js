// @flow

import * as React from 'react';

import {
  setThreadUnreadStatus,
  setThreadUnreadStatusActionTypes,
} from '../actions/activity-actions.js';
import type {
  SetThreadUnreadStatusPayload,
  SetThreadUnreadStatusRequest,
} from '../types/activity-types.js';
import type { ThreadInfo } from '../types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from '../utils/action-utils.js';

function useToggleUnreadStatus(
  threadInfo: ThreadInfo,
  mostRecentNonLocalMessage: ?string,
  afterAction: () => void,
): () => void {
  const dispatchActionPromise = useDispatchActionPromise();
  const { currentUser } = threadInfo;
  const boundSetThreadUnreadStatus: (
    request: SetThreadUnreadStatusRequest,
  ) => Promise<SetThreadUnreadStatusPayload> = useServerCall(
    setThreadUnreadStatus,
  );
  const toggleUnreadStatus = React.useCallback(() => {
    const request = {
      threadID: threadInfo.id,
      unread: !currentUser.unread,
      latestMessage: mostRecentNonLocalMessage,
    };
    dispatchActionPromise(
      setThreadUnreadStatusActionTypes,
      boundSetThreadUnreadStatus(request),
      undefined,
      {
        threadID: threadInfo.id,
        unread: !currentUser.unread,
      },
    );
    afterAction();
  }, [
    threadInfo.id,
    currentUser.unread,
    mostRecentNonLocalMessage,
    dispatchActionPromise,
    afterAction,
    boundSetThreadUnreadStatus,
  ]);

  return toggleUnreadStatus;
}

export default useToggleUnreadStatus;
