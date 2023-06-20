// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useSelector } from '../redux/redux-utils.js';

type MessageSearchState = {
  +query: string,
  +setQuery: string => void,
  +clearQuery: () => void,
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

  const threadID = useSelector(state => state.navInfo.activeChatThreadID);

  invariant(threadID, 'threadID should be set when search messages');

  const setQuery = React.useCallback(
    (query: string) =>
      setQueries(prevQueries => ({ ...prevQueries, [threadID]: query })),
    [threadID],
  );

  const clearQuery = React.useCallback(
    () =>
      setQueries(prevQueries => {
        delete prevQueries[threadID];
        return { ...prevQueries };
      }),
    [threadID],
  );

  const state = React.useMemo(
    () => ({
      query: queries[threadID] ?? '',
      setQuery,
      clearQuery,
    }),
    [queries, setQuery, threadID, clearQuery],
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
