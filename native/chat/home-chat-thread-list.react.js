// @flow

import type { ChatTopTabsNavigationProp } from './chat.react';
import type { NavigationRoute } from '../navigation/route-names';

import * as React from 'react';

import { threadInHomeChatList } from 'lib/shared/thread-utils';

import ChatThreadList from './chat-thread-list.react';

type HomeChatThreadListProps = {|
  navigation: ChatTopTabsNavigationProp<'HomeChatThreadList'>,
  route: NavigationRoute<'HomeChatThreadList'>,
|};
export default function HomeChatThreadList(props: HomeChatThreadListProps) {
  return (
    <ChatThreadList
      navigation={props.navigation}
      route={props.route}
      filterThreads={threadInHomeChatList}
    />
  );
}
