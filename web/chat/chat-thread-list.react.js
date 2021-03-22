// @flow

import invariant from 'invariant';
import * as React from 'react';

import { emptyItemText } from 'lib/shared/thread-utils';

import css from './chat-tabs.css';
import ChatThreadListItem from './chat-thread-list-item.react';
import { ThreadListContext } from './thread-list-provider';

type Props = {|
  +setModal: (modal: ?React.Node) => void,
|};
function ChatThreadList(props: Props) {
  const { setModal } = props;

  const threadListContext = React.useContext(ThreadListContext);
  invariant(
    threadListContext,
    'threadListContext should be set in ChatThreadList',
  );
  const { threadList, activeTab } = threadListContext;
  const isBackground = activeTab === 'BACKGROUND';

  const listData: React.Node[] = React.useMemo(() => {
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
  return <div>{listData}</div>;
}

function EmptyItem() {
  return <div className={css.emptyItem}>{emptyItemText}</div>;
}

export default ChatThreadList;
