// @flow

import * as React from 'react';

import { useIsThreadInChatList } from './thread-utils.js';
import threadWatcher from './thread-watcher.js';
import { fetchMostRecentMessagesActionTypes } from '../actions/message-actions.js';
import { useFetchMostRecentMessages } from '../hooks/message-hooks.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';

function useWatchThread(threadInfo: ?ThreadInfo) {
  const dispatchActionPromise = useDispatchActionPromise();
  const callFetchMostRecentMessages = useFetchMostRecentMessages();

  const threadID = threadInfo?.id;
  const threadIsInChatList = useIsThreadInChatList(threadInfo);
  React.useEffect(() => {
    if (threadID && !threadIsInChatList) {
      threadWatcher.watchID(threadID);
      void dispatchActionPromise(
        fetchMostRecentMessagesActionTypes,
        callFetchMostRecentMessages({ threadID }),
      );
    }
    return () => {
      if (threadID && !threadIsInChatList) {
        threadWatcher.removeID(threadID);
      }
    };
  }, [
    callFetchMostRecentMessages,
    dispatchActionPromise,
    threadIsInChatList,
    threadID,
  ]);
}

export { useWatchThread };
