// @flow

import * as React from 'react';
import ChatThreadList from './chat-thread-list.react';
import type { ChatTopTabsNavigationProp } from './chat.react';
import { threadInBackgroundChatList } from 'lib/shared/thread-utils';
import { type ThreadInfo, type RawThreadInfo } from 'lib/types/thread-types';

type BackgroundChatThreadListProps = {
  navigation: ChatTopTabsNavigationProp<'BackgroundChatThreadList'>,
};
export default function BackgroundChatThreadList(
  props: BackgroundChatThreadListProps,
) {
  const filterFunction = React.useCallback(
    (item: ?(ThreadInfo | RawThreadInfo)) => {
      return threadInBackgroundChatList(item);
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
