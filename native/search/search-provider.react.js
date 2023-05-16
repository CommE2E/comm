// @flow

import * as React from 'react';

import type { SetState } from 'lib/types/hook-types.js';

export type MessageSearchContextType = {
  +query: string,
  +setQuery: SetState<string>,
  +clearQuery: () => void,
};

const MessageSearchContext: React.Context<?MessageSearchContextType> =
  React.createContext<?MessageSearchContextType>();

type Props = {
  +children: React.Node,
};
function MessageSearchProvider(props: Props): React.Node {
  const { children } = props;

  const [query, setQuery] = React.useState('');

  const clearQuery = React.useCallback(() => setQuery(''), []);

  const context = React.useMemo(
    () => ({
      query,
      setQuery,
      clearQuery,
    }),
    [query, clearQuery],
  );

  return (
    <MessageSearchContext.Provider value={context}>
      {children}
    </MessageSearchContext.Provider>
  );
}

export { MessageSearchContext, MessageSearchProvider };
