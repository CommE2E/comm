// @flow

import invariant from 'invariant';
import * as React from 'react';

import { emptyItemText } from 'lib/shared/thread-utils';

import ChatThreadListItem from './chat-thread-list-item.react';
import css from './chat-thread-list.css';
import { ThreadListContext } from './thread-list-provider';
import ThreadListSearch from './thread-list-search.react';

type Props = {
  +setModal: (modal: ?React.Node) => void,
};

function ChatThreadList(props: Props): React.Node {
  const { setModal } = props;
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
      <ChatThreadListItem
        item={item}
        key={item.threadInfo.id}
        setModal={setModal}
      />
    ));
    if (threads.length === 0 && isBackground) {
      threads.push(<EmptyItem key="emptyItem" />);
    }
    return threads;
  }, [threadList, isBackground, setModal]);

  return (
    <div className={css.threadListContainer}>
      <ThreadListSearch onChangeText={setSearchText} searchText={searchText} />
      <div>{threadComponents}</div>
    </div>
  );
}

function EmptyItem() {
  return <div className={css.emptyItem}>{emptyItemText}</div>;
}

export default ChatThreadList;
