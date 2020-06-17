// @flow

import * as React from 'react';
import ChatThreadList from './chat-thread-list.react';
import type { ChatTopTabsNavigationProp } from './chat.react';
import { threadInHomeChatList } from 'lib/shared/thread-utils';
import { type ThreadInfo, type RawThreadInfo } from 'lib/types/thread-types';

type HomeChatThreadListProps = {
  navigation: ChatTopTabsNavigationProp<'HomeChatThreadList'>,
};
export default function HomeChatThreadList(props: HomeChatThreadListProps) {
  const filterFunction = React.useCallback(
    (item: ?(ThreadInfo | RawThreadInfo)) => {
      return threadInHomeChatList(item);
    },
    [],
  );
  return (
    <ChatThreadList
      navigation={props.navigation}
      filterChats={filterFunction}
    />
  );
}
