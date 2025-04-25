// @flow

import * as React from 'react';

import {
  setThreadUnreadStatusActionTypes,
  useSetThreadUnreadStatus,
} from '../actions/activity-actions.js';
import type { UseSetThreadUnreadStatusInput } from '../actions/activity-actions.js';
import type { SetThreadUnreadStatusPayload } from '../types/activity-types.js';
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
    input: UseSetThreadUnreadStatusInput,
  ) => Promise<SetThreadUnreadStatusPayload> = useSetThreadUnreadStatus();

  const toggleUnreadStatus = React.useCallback(() => {
    const input = {
      threadInfo,
      threadID: threadInfo.id,
      unread: !currentUser.unread,
      latestMessage: mostRecentNonLocalMessage,
    };

    void dispatchActionPromise(
      setThreadUnreadStatusActionTypes,
      boundSetThreadUnreadStatus(input),
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
