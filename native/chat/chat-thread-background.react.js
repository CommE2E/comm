// @flow

import type { ChatTopTabsNavigationProp } from './chat.react';

import * as React from 'react';

import { threadInBackgroundChatList } from 'lib/shared/thread-utils';

import ChatThreadList from './chat-thread-list.react';

type BackgroundChatThreadListProps = {
  navigation: ChatTopTabsNavigationProp<'BackgroundChatThreadList'>,
  ...
};
export default function BackgroundChatThreadList(
  props: BackgroundChatThreadListProps,
) {
  return (
    <ChatThreadList
      navigation={props.navigation}
      filterThreads={threadInBackgroundChatList}
    />
  );
}
