// @flow

import * as React from 'react';
import ChatThreadList from './chat-thread-list.react';
import type { ChatTopTabsNavigationProp } from './chat.react';
import { threadInHomeChatList } from 'lib/shared/thread-utils';

type HomeChatThreadListProps = {
  navigation: ChatTopTabsNavigationProp<'HomeChatThreadList'>,
  ...
};
export default function HomeChatThreadList(props: HomeChatThreadListProps) {
  return (
    <ChatThreadList
      navigation={props.navigation}
      filterThreads={threadInHomeChatList}
    />
  );
}
