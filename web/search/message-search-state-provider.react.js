// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useSearchMessages } from 'lib/shared/search-utils.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import type { RawMessageInfo } from 'lib/types/message-types.js';

type MessageSearchState = {
  +getQuery: (threadID: string) => string,
  +setQuery: (query: string, threadID: string) => void,
  +clearQuery: (threadID: string) => void,
  +getSearchResults: (threadID: string) => $ReadOnlyArray<RawMessageInfo>,
  +appendSearchResult: (
    $ReadOnlyArray<RawMessageInfo>,
    threadID: string,
  ) => void,
  +getEndReached: (threadID: string) => boolean,
  +setEndReached: (threadID: string) => void,
  +searchMessages: (threadID: string) => void,
};

const MessageSearchContext: React.Context<?MessageSearchState> =
  React.createContext<?MessageSearchState>(null);

type Props = {
  +children: React.Node,
};

function MessageSearchStateProvider(props: Props): React.Node {
  const queries = React.useRef<{
    [threadID: string]: string,
  }>({});

  const [results, setResults] = React.useState<{
    [threadID: string]: $ReadOnlyArray<RawMessageInfo>,
  }>({});

  const endsReached = React.useRef(new Set());

  const lastIDs = React.useRef<{
    [threadID: string]: string,
  }>({});

  const setEndReached = React.useCallback((threadID: string) => {
    endsReached.current.add(threadID);
  }, []);

  const removeEndReached = React.useCallback(
    (threadID: string) => endsReached.current.delete(threadID),
    [],
  );

  const getEndReached = React.useCallback(
    (threadID: string) => endsReached.current.has(threadID),
    [],
  );

  const appendResult = React.useCallback(
    (result: $ReadOnlyArray<RawMessageInfo>, threadID: string) => {
      const lastMessageID = oldestMessageID(result);
      if (lastMessageID) {
        lastIDs.current[threadID] = lastMessageID;
      }
      setResults(prevResults => {
        const prevThreadResults = prevResults[threadID] ?? [];
        const newThreadResults = [...prevThreadResults, ...result];
        return { ...prevResults, [threadID]: newThreadResults };
      });
    },
    [],
  );

  const clearResults = React.useCallback(
    (threadID: string) => {
      loading.current = false;
      delete lastIDs.current[threadID];
      removeEndReached(threadID);
      setResults(prevResults => {
        const { [threadID]: deleted, ...newState } = prevResults;
        return newState;
      });
    },
    [removeEndReached],
  );

  const getResults = React.useCallback(
    (threadID: string) => results[threadID] ?? [],
    [results],
  );

  const getQuery = React.useCallback(
    (threadID: string) => queries.current[threadID] ?? '',
    [],
  );

  const setQuery = React.useCallback(
    (query: string, threadID: string) => {
      clearResults(threadID);
      queries.current[threadID] = query;
    },
    [clearResults],
  );

  const clearQuery = React.useCallback(
    (threadID: string) => {
      clearResults(threadID);
      delete queries.current[threadID];
    },
    [clearResults],
  );

  const searchMessagesCall = useSearchMessages();

  const loading = React.useRef(false);
  const queryIDRef = React.useRef(0);

  const appendResults = React.useCallback(
    (
      newMessages: $ReadOnlyArray<RawMessageInfo>,
      end: boolean,
      queryID: number,
      threadID: string,
    ) => {
      if (queryID !== queryIDRef.current) {
        return;
      }

      appendResult(newMessages, threadID);
      if (end) {
        setEndReached(threadID);
      }
      loading.current = false;
    },
    [appendResult, setEndReached],
  );

  const searchMessages = React.useCallback(
    (threadID: string) => {
      if (loading.current || endsReached.current.has(threadID)) {
        return;
      }
      queryIDRef.current += 1;
      loading.current = true;
      const query = getQuery(threadID);
      searchMessagesCall(
        query,
        threadID,
        appendResults,
        queryIDRef.current,
        lastIDs.current[threadID],
      );
    },
    [appendResults, getQuery, searchMessagesCall],
  );

  const state = React.useMemo(
    () => ({
      getQuery,
      setQuery,
      clearQuery,
      getSearchResults: getResults,
      appendSearchResult: appendResult,
      getEndReached,
      setEndReached,
      searchMessages,
    }),
    [
      getQuery,
      setQuery,
      clearQuery,
      getResults,
      appendResult,
      getEndReached,
      setEndReached,
      searchMessages,
    ],
  );

  return (
    <MessageSearchContext.Provider value={state}>
      {props.children}
    </MessageSearchContext.Provider>
  );
}

function oldestMessageID(data: $ReadOnlyArray<RawMessageInfo>) {
  if (!data) {
    return undefined;
  }
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].type === messageTypes.TEXT) {
      return data[i].id;
    }
  }
  return undefined;
}

function useMessageSearchContext(): MessageSearchState {
  const context = React.useContext(MessageSearchContext);
  invariant(context, 'MessageSearchContext not found');

  return context;
}

export { MessageSearchStateProvider, useMessageSearchContext };
