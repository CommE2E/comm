// @flow

import type { ChatTopTabsNavigationProp } from './chat.react';

import * as React from 'react';
import { useSelector } from 'react-redux';

import { threadInBackgroundChatList } from 'lib/shared/thread-utils';
import {
  type ChatThreadItem,
  chatListData,
} from 'lib/selectors/chat-selectors';

import ChatThreadList from './chat-thread-list.react';

type BackgroundChatThreadListProps = {
  navigation: ChatTopTabsNavigationProp<'BackgroundChatThreadList'>,
  ...
};
export default function BackgroundChatThreadList(
  props: BackgroundChatThreadListProps,
) {
  const chatThreadListData = useSelector(state => chatListData(state));

  const findUnreadBackgroundThreadsNumber = (
    chatThreadsListData: Array<ChatThreadItem>,
  ): number => {
    return chatThreadsListData
      .map(info => ({
        home: info.threadInfo.currentUser.subscription.home,
        unread: info.threadInfo.currentUser.unread,
      }))
      .filter(item => !item.home && item.unread).length;
  };

  const prevUnreadNumber = React.useRef(0);
  const unreadBackgroundThreadsNumber = React.useMemo(() => {
    return findUnreadBackgroundThreadsNumber(chatThreadListData);
  }, [chatThreadListData]);

  React.useEffect(() => {
    if (unreadBackgroundThreadsNumber == prevUnreadNumber.current) return;
    prevUnreadNumber.current = unreadBackgroundThreadsNumber;
    let title = 'Background';
    if (unreadBackgroundThreadsNumber !== 0)
      title = title.concat(' (', unreadBackgroundThreadsNumber.toString(), ')');
    props.navigation.setOptions({
      title: title,
    });
  });

  return (
    <ChatThreadList
      navigation={props.navigation}
      filterThreads={threadInBackgroundChatList}
    />
  );
}
