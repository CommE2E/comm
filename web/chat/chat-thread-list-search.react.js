// @flow

import invariant from 'invariant';
import * as React from 'react';

import css from './chat-thread-list.css';
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
      <div className={css.searchBarContainer}>
        <Search
          onChangeText={setSearchText}
          searchText={searchText}
          placeholder="Search chats"
        />
      </div>
    ),
    [searchText, setSearchText],
  );
}

export default ChatThreadListSearch;
