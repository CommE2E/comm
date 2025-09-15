// @flow

import invariant from 'invariant';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import { processFarcasterOpsActionType } from './farcaster-actions.js';
import { useFetchMessagesForConversation } from './farcaster-hooks.js';
import {
  type MessageTruncationStatus,
  messageTruncationStatus,
  type RawMessageInfo,
} from '../../types/message-types.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import { conversationIDFromFarcasterThreadID } from '../id-utils.js';
import { fetchMessagesFromDB } from '../message-utils.js';

type ThreadFetchingState = {
  +farcasterCursor: ?string,
  +dbExhausted: boolean,
  +farcasterExhausted: boolean,
};

export type FarcasterMessageFetchingContextType = {
  +fetchMoreMessages: (
    threadID: string,
    numMessages: number,
    currentOffset: number,
  ) => Promise<void>,
};

const FarcasterMessageFetchingContext: React.Context<?FarcasterMessageFetchingContextType> =
  React.createContext<?FarcasterMessageFetchingContextType>(null);

type ProcessResultsInput = {
  +dbResult: ?{
    +threadID: string,
    +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
    +truncationStatus: MessageTruncationStatus,
  },
  +farcasterResult: ?{
    +messages: $ReadOnlyArray<RawMessageInfo>,
    +newCursor: ?string,
    +userIDs: $ReadOnlyArray<string>,
  },
};

type ProcessResultsOutput = {
  +combinedMessages: $ReadOnlyArray<RawMessageInfo>,
  +newCursor: ?string,
  +bothExhausted: boolean,
  +userIDs: $ReadOnlyArray<string>,
};

function processResults(input: ProcessResultsInput): ProcessResultsOutput {
  const { dbResult, farcasterResult } = input;

  const dbMessages = dbResult?.rawMessageInfos ?? [];
  const farcasterMessages = farcasterResult?.messages ?? [];

  // Deduplicate messages, keeping Farcaster messages over DB messages
  const messageMap = new Map<string, RawMessageInfo>();

  for (const message of dbMessages) {
    if (message.id) {
      messageMap.set(message.id, message);
    }
  }

  for (const message of farcasterMessages) {
    if (message.id) {
      messageMap.set(message.id, message);
    }
  }

  const combinedMessages = Array.from(messageMap.values());

  const newCursor = farcasterResult?.newCursor ?? null;
  const dbExhausted =
    dbResult?.truncationStatus === messageTruncationStatus.EXHAUSTIVE;
  const farcasterExhausted = !newCursor;

  return {
    combinedMessages,
    newCursor,
    bothExhausted: dbExhausted && farcasterExhausted,
    userIDs: farcasterResult?.userIDs ?? [],
  };
}

type Props = {
  +children: React.Node,
};

function FarcasterMessageFetchingProvider(props: Props): React.Node {
  const { children } = props;

  const [threadStates, setThreadStates] = React.useState<{
    [threadID: string]: ThreadFetchingState,
  }>({});

  const getState = React.useCallback(
    (threadID: string): ThreadFetchingState => {
      return (
        threadStates[threadID] ?? {
          farcasterCursor: null,
          dbExhausted: false,
          farcasterExhausted: false,
        }
      );
    },
    [threadStates],
  );

  const updateState = React.useCallback(
    (threadID: string, updates: Partial<ThreadFetchingState>) => {
      setThreadStates(prevStates => ({
        ...prevStates,
        [threadID]: {
          ...getState(threadID),
          ...updates,
        },
      }));
    },
    [getState],
  );

  const fetchFarcasterMessagesForConversation =
    useFetchMessagesForConversation();
  const dispatch = useDispatch();
  const fetchMoreMessages = React.useCallback(
    async (
      threadID: string,
      numMessages: number,
      currentOffset: number,
    ): Promise<void> => {
      const state =
        currentOffset === 0
          ? {
              farcasterCursor: null,
              dbExhausted: false,
              farcasterExhausted: false,
            }
          : getState(threadID);
      const conversationID = conversationIDFromFarcasterThreadID(threadID);

      const dbPromise = !state.dbExhausted
        ? fetchMessagesFromDB(threadID, numMessages, currentOffset)
        : Promise.resolve(null);

      const farcasterPromise = !state.farcasterExhausted
        ? fetchFarcasterMessagesForConversation(
            conversationID,
            numMessages,
            state.farcasterCursor ?? null,
          )
        : Promise.resolve(null);

      const [dbResult, farcasterResult] = await Promise.allSettled([
        dbPromise,
        farcasterPromise,
      ]);

      const processedResults = processResults({
        dbResult: dbResult.status === 'fulfilled' ? dbResult.value : null,
        farcasterResult:
          farcasterResult.status === 'fulfilled' ? farcasterResult.value : null,
      });

      updateState(threadID, {
        farcasterCursor: processedResults.newCursor,
        dbExhausted:
          dbResult.status === 'fulfilled' &&
          dbResult.value?.truncationStatus ===
            messageTruncationStatus.EXHAUSTIVE,
        farcasterExhausted: !processedResults.newCursor,
      });

      dispatch({
        type: processFarcasterOpsActionType,
        payload: {
          rawMessageInfos: processedResults.combinedMessages,
          updateInfos: ([]: Array<ClientUpdateInfo>),
          userIDs: processedResults.userIDs,
          truncationStatuses: {
            [threadID]: processedResults.bothExhausted
              ? messageTruncationStatus.EXHAUSTIVE
              : messageTruncationStatus.UNCHANGED,
          },
        },
      });
    },
    [getState, fetchFarcasterMessagesForConversation, updateState, dispatch],
  );

  const contextValue = React.useMemo(
    () => ({
      fetchMoreMessages,
    }),
    [fetchMoreMessages],
  );

  return (
    <FarcasterMessageFetchingContext.Provider value={contextValue}>
      {children}
    </FarcasterMessageFetchingContext.Provider>
  );
}

function useFarcasterMessageFetching(): FarcasterMessageFetchingContextType {
  const context = React.useContext(FarcasterMessageFetchingContext);
  invariant(context, 'FarcasterMessageFetchingContext must be set');
  return context;
}

export { FarcasterMessageFetchingProvider, useFarcasterMessageFetching };
