// @flow

import invariant from 'invariant';
import * as React from 'react';

import { ThreadListContext } from './thread-list-provider.js';
import Search from '../components/search.react.js';

function ChatThreadListSearch(): React.Node {
  const threadListContext = React.useContext(ThreadListContext);
  invariant(
    threadListContext,
    'threadListContext should be set in ChatThreadListSearch',
  );
  const { setSearchText, searchText } = threadListContext;

  return React.useMemo(
    () => (
      <Search
        onChangeText={setSearchText}
        searchText={searchText}
        placeholder="Search chats"
      />
    ),
    [searchText, setSearchText],
  );
}

export default ChatThreadListSearch;
