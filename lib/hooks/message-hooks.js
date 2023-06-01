// @flow

import _max from 'lodash/fp/max.js';
import _min from 'lodash/fp/min.js';
import * as React from 'React';

import {
  fetchLatestMessages,
  fetchLatestMessagesActionTypes,
} from '../actions/message-actions.js';
import { createLoadingStatusSelector } from '../selectors/loading-selectors.js';
import { getOldestNonLocalMessageID } from '../shared/message-utils.js';
import type { LoadingStatus } from '../types/loading-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from '../utils/action-utils.js';
import { values } from '../utils/objects.js';
import { useSelector } from '../utils/redux-utils.js';

function useOldestMessageServerID(threadID: string): ?string {
  return useSelector(state =>
    getOldestNonLocalMessageID(threadID, state.messageStore),
  );
}

type FetchLatestMessagesState =
  | { type: 'everything_loaded' }
  | { type: 'loaded_upto_message', message: string };

function useFetchLatestMessages(home: boolean): {
  fetchMoreLatestMessages: () => Promise<void>,
  loadingStatus: LoadingStatus,
} {
  const dispatchActionPromise = useDispatchActionPromise();
  const callFetchLatestMessages = useServerCall(fetchLatestMessages);

  const messageStoreThreads = useSelector(state => state.messageStore.threads);
  const [fetchState, setFetchState] =
    React.useState<?FetchLatestMessagesState>(null);

  React.useEffect(() => {
    if (values(messageStoreThreads).length === 0) {
      setFetchState(null);
    } else if (fetchState === null) {
      const latestMessageForThread = thread =>
        _max(thread.messageIDs.map(Number));

      const oldestLatestMessage = _min(
        values(messageStoreThreads).map(latestMessageForThread),
      );

      if (oldestLatestMessage) {
        setFetchState({
          type: 'loaded_upto_message',
          message: oldestLatestMessage.toString(),
        });
      }
    }
  }, [fetchState, messageStoreThreads]);

  const fetchMoreLatestMessages = React.useCallback(async () => {
    if (fetchState?.type !== 'loaded_upto_message') {
      return;
    }

    await dispatchActionPromise(
      fetchLatestMessagesActionTypes,
      (async () => {
        const result = await callFetchLatestMessages({
          home,
          fromMessage: fetchState.message,
        });

        if (result.rawMessageInfos.length > 0) {
          const oldestMessage = _min(
            result.rawMessageInfos.map(message => Number(message.id)),
          ).toString();

          if (oldestMessage === fetchState.message) {
            setFetchState({ type: 'everything_loaded' });
          } else {
            setFetchState({
              type: 'loaded_upto_message',
              message: oldestMessage.toString(),
            });
          }
        }

        return result;
      })(),
    );
  }, [fetchState, dispatchActionPromise, callFetchLatestMessages, home]);

  const loadingStatusSelector = createLoadingStatusSelector(
    fetchLatestMessagesActionTypes,
  );
  const loadingStatus = useSelector(loadingStatusSelector);

  return {
    fetchMoreLatestMessages,
    loadingStatus,
  };
}

export { useOldestMessageServerID, useFetchLatestMessages };
