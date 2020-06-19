// @flow

import type { ChatTopTabsNavigationProp } from './chat.react';

import * as React from 'react';

import { threadInHomeChatList } from 'lib/shared/thread-utils';

import ChatThreadList from './chat-thread-list.react';

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
