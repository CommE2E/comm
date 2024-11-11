// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useThreadSearchIndex } from '../selectors/nav-selectors.js';
import SearchIndex from '../shared/search-index.js';
import { values } from '../utils/objects.js';
import { useSelector } from '../utils/redux-utils.js';

type GlobalSearchIndexContextType = {
  +searchIndex: SearchIndex,
};

const GlobalSearchIndexContext: React.Context<?GlobalSearchIndexContextType> =
  React.createContext();

type Props = {
  +children: React.Node,
};
function GlobalSearchIndexProvider(props: Props): React.Node {
  const threadInfos = useSelector(state => state.threadStore.threadInfos);
  const threadInfosArray = React.useMemo(
    () => values(threadInfos),
    [threadInfos],
  );
  const searchIndex = useThreadSearchIndex(threadInfosArray);
  const context = React.useMemo(() => ({ searchIndex }), [searchIndex]);
  return (
    <GlobalSearchIndexContext.Provider value={context}>
      {props.children}
    </GlobalSearchIndexContext.Provider>
  );
}

function useGlobalThreadSearchIndex(): SearchIndex {
  const globalSearchIndexContext = React.useContext(GlobalSearchIndexContext);
  invariant(globalSearchIndexContext, 'globalSearchIndexContext should be set');
  return globalSearchIndexContext.searchIndex;
}

export { GlobalSearchIndexProvider, useGlobalThreadSearchIndex };
