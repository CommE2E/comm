// @flow

import invariant from 'invariant';
import * as React from 'react';

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

  const [endsReached, setEndsReached] = React.useState(new Set());

  const setEndReached = React.useCallback(
    (threadID: string) =>
      setEndsReached(ends => new Set([...ends.values(), threadID])),
    [],
  );

  const removeEndReached = React.useCallback(
    (threadID: string) =>
      setEndsReached(ends => {
        const temp = new Set(ends);
        temp.delete(threadID);
        return temp;
      }),
    [],
  );

  const getEndReached = React.useCallback(
    (threadID: string) => endsReached.has(threadID),
    [endsReached],
  );

  const appendResult = React.useCallback(
    (result: $ReadOnlyArray<RawMessageInfo>, threadID: string) =>
      setResults(prevResults => {
        const prevThreadResults = prevResults[threadID] ?? [];
        const newThreadResults = [...prevThreadResults, ...result];
        return { ...prevResults, [threadID]: newThreadResults };
      }),
    [],
  );

  const clearResults = React.useCallback(
    (threadID: string) => {
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
      queries.current = { ...queries.current, [threadID]: query };
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

  const state = React.useMemo(
    () => ({
      getQuery,
      setQuery,
      clearQuery,
      getSearchResults: getResults,
      appendSearchResult: appendResult,
      getEndReached,
      setEndReached,
    }),
    [
      getQuery,
      setQuery,
      clearQuery,
      getResults,
      appendResult,
      getEndReached,
      setEndReached,
    ],
  );

  return (
    <MessageSearchContext.Provider value={state}>
      {props.children}
    </MessageSearchContext.Provider>
  );
}

function useMessageSearchContext(): MessageSearchState {
  const context = React.useContext(MessageSearchContext);
  invariant(context, 'MessageSearchContext not found');

  return context;
}

export { MessageSearchStateProvider, useMessageSearchContext };
