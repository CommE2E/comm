// @flow

import * as React from 'react';

import {
  setThreadUnreadStatusActionTypes,
  useSetThreadUnreadStatus,
} from '../actions/activity-actions.js';
import type { UseSetThreadUnreadStatusInput } from '../actions/activity-actions.js';
import type { SetThreadUnreadStatusPayload } from '../types/activity-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadTypeIsThick } from '../types/thread-types-enum.js';
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
    const request = {
      threadID: threadInfo.id,
      unread: !currentUser.unread,
      latestMessage: mostRecentNonLocalMessage,
    };
    const input = threadTypeIsThick(threadInfo.type)
      ? {
          thick: true,
          threadInfo,
          ...request,
        }
      : { thick: false, ...request };

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
