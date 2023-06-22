// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { RawMessageInfo } from 'lib/types/message-types.js';

import { useSelector } from '../redux/redux-utils.js';

type MessageSearchState = {
  +getQuery: () => string,
  +setQuery: string => void,
  +clearQuery: () => void,
  +searchResults: $ReadOnlyArray<RawMessageInfo>,
  +appendSearchResult: ($ReadOnlyArray<RawMessageInfo>) => void,
  +endReached: boolean,
  +setEndReached: () => void,
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

  const threadID = useSelector(state => state.navInfo.activeChatThreadID);

  invariant(threadID, 'threadID should be set when search messages');

  const setEndReached = React.useCallback(
    () => setEndsReached(ends => new Set([...ends.values(), threadID])),
    [threadID],
  );

  const removeEndReached = React.useCallback(
    () =>
      setEndsReached(ends => {
        const temp = new Set(ends);
        temp.delete(threadID);
        return temp;
      }),
    [threadID],
  );

  const appendResult = React.useCallback(
    (result: $ReadOnlyArray<RawMessageInfo>) =>
      setResults(prevResults => {
        const prevThreadResults = prevResults[threadID] ?? [];
        const newThreadResults = [...prevThreadResults, ...result];
        return { ...prevResults, [threadID]: newThreadResults };
      }),
    [threadID],
  );

  const clearResults = React.useCallback(() => {
    removeEndReached();
    setResults(prevResults => {
      const { [threadID]: deleted, ...newState } = prevResults;
      return newState;
    });
  }, [threadID, removeEndReached]);

  const setQuery = React.useCallback(
    (query: string) => {
      clearResults();
      queries.current = { ...queries.current, [threadID]: query };
    },
    [threadID, clearResults],
  );

  const clearQuery = React.useCallback(() => {
    clearResults();
    delete queries.current[threadID];
  }, [threadID, clearResults]);

  const getQuery = React.useCallback(
    () => queries.current[threadID] ?? '',
    [threadID],
  );

  const state = React.useMemo(
    () => ({
      getQuery,
      setQuery,
      clearQuery,
      searchResults: results[threadID] ?? [],
      appendSearchResult: appendResult,
      endReached: endsReached.has(threadID),
      setEndReached,
    }),
    [
      getQuery,
      setQuery,
      clearQuery,
      results,
      threadID,
      appendResult,
      endsReached,
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
