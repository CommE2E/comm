// @flow

import * as React from 'react';

import {
  setThreadUnreadStatusActionTypes,
  useSetThreadUnreadStatus,
} from '../actions/activity-actions.js';
import type {
  SetThreadUnreadStatusPayload,
  SetThreadUnreadStatusRequest,
} from '../types/activity-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';

function useToggleUnreadStatus(
  threadInfo: ThreadInfo,
  mostRecentNonLocalMessage: ?string,
  afterAction: () => void,
): () => void {
  const dispatchActionPromise = useDispatchActionPromise();
  const { currentUser } = threadInfo;
  const boundSetThreadUnreadStatus: (
    request: SetThreadUnreadStatusRequest,
  ) => Promise<SetThreadUnreadStatusPayload> =
    useSetThreadUnreadStatus(threadInfo);

  const toggleUnreadStatus = React.useCallback(() => {
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
