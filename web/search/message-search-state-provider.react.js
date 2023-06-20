// @flow

import invariant from 'invariant';
import * as React from 'react';

type MessageSearchState = {
  +getQuery: (threadID: string) => string,
  +setQuery: (query: string, threadID: string) => void,
  +clearQuery: (threadID: string) => void,
};

const MessageSearchContext: React.Context<?MessageSearchState> =
  React.createContext<?MessageSearchState>(null);

type Props = {
  +children: React.Node,
};

function MessageSearchStateProvider(props: Props): React.Node {
  const [queries, setQueries] = React.useState<{
    [threadID: string]: string,
  }>({});

  const setQuery = React.useCallback(
    (query: string, threadID: string) =>
      setQueries(prevQueries => ({ ...prevQueries, [threadID]: query })),
    [],
  );

  const clearQuery = React.useCallback(
    (threadID: string) =>
      setQueries(prevQueries => {
        const { [threadID]: deleted, ...newState } = prevQueries;
        return newState;
      }),
    [],
  );

  const getQuery = React.useCallback(
    (threadID: string) => queries[threadID] ?? '',
    [queries],
  );

  const state = React.useMemo(
    () => ({
      getQuery,
      setQuery,
      clearQuery,
    }),
    [getQuery, setQuery, clearQuery],
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
