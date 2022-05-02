// @flow

import invariant from 'invariant';
import * as React from 'react';

import { emptyItemText } from 'lib/shared/thread-utils';

import {
  assetCacheURLPrefix,
  backgroundIllustrationFileName,
  backgroundIllustrationHeight,
  backgroundIllustrationWidth,
} from '../assets';
import Search from '../components/search.react';
import ChatThreadListItem from './chat-thread-list-item.react';
import css from './chat-thread-list.css';
import { ThreadListContext } from './thread-list-provider';

function ChatThreadList(): React.Node {
  const threadListContext = React.useContext(ThreadListContext);
  invariant(
    threadListContext,
    'threadListContext should be set in ChatThreadList',
  );
  const {
    activeTab,
    threadList,
    setSearchText,
    searchText,
  } = threadListContext;
  const isBackground = activeTab === 'Background';

  const threadComponents: React.Node[] = React.useMemo(() => {
    const threads = threadList.map(item => (
      <ChatThreadListItem item={item} key={item.threadInfo.id} />
    ));
    if (threads.length === 0 && isBackground) {
      threads.push(<EmptyItem key="emptyItem" />);
    }
    return threads;
  }, [threadList, isBackground]);

  return (
    <div className={css.threadListContainer}>
      <Search
        onChangeText={setSearchText}
        searchText={searchText}
        placeholder="Search threads"
      />
      <div>{threadComponents}</div>
    </div>
  );
}

function EmptyItem() {
  return (
    <div className={css.emptyItemContainer}>
      <img
        src={`${assetCacheURLPrefix}/${backgroundIllustrationFileName}`}
        height={backgroundIllustrationHeight}
        width={backgroundIllustrationWidth}
      />
      <div className={css.emptyItemText}>{emptyItemText}</div>
    </div>
  );
}

export default ChatThreadList;
