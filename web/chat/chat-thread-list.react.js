// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import * as React from 'react';

import { useSelector } from '../redux/redux-utils';
import { webChatListData } from '../selectors/chat-selectors';

import ChatThreadListItem from './chat-thread-list-item.react';

type Props = {|
  +filterThreads: (threadItem: ThreadInfo) => boolean,
  +emptyItem?: React.ComponentType<{||}>,
|};
function ChatThreadList(props: Props) {
  const { filterThreads, emptyItem } = props;
  const chatListData = useSelector(webChatListData);
  const listData: React.Node[] = React.useMemo(() => {
    const threads = chatListData
      .filter((item) => filterThreads(item.threadInfo))
      .map((item) => (
        <ChatThreadListItem item={item} key={item.threadInfo.id} />
      ));
    if (threads.length === 0 && emptyItem) {
      const EmptyItem = emptyItem;
      threads.push(<EmptyItem />);
    }
    return threads;
  }, [chatListData, filterThreads, emptyItem]);
  return <div>{listData}</div>;
}

export default ChatThreadList;
