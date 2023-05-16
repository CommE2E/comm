// @flow

import invariant from 'invariant';
import * as React from 'react';

import SearchBox from './search-bar.react.js';
import { MessageSearchContext } from './search-provider.react.js';

function SearchHeader(): React.Node {
  const searchContext = React.useContext(MessageSearchContext);
  invariant(searchContext, 'searchContext should be set');
  const { setQuery, clearQuery } = searchContext;

  return <SearchBox onPressSend={setQuery} onClear={clearQuery} />;
}

export default SearchHeader;
